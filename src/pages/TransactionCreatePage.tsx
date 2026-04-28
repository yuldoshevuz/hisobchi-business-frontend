import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdjustmentForm } from '@/components/transactions/forms/AdjustmentForm';
import { BorrowForm } from '@/components/transactions/forms/BorrowForm';
import { CreditSaleForm } from '@/components/transactions/forms/CreditSaleForm';
import { PurchaseForm } from '@/components/transactions/forms/PurchaseForm';
import { SaleForm } from '@/components/transactions/forms/SaleForm';
import { TransferForm } from '@/components/transactions/forms/TransferForm';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';
import {
  TRANSACTION_USE_CASE_VALUES,
  TRANSACTION_USE_CASES,
  type TransactionUseCase,
} from '@/lib/transaction-use-cases';

function normalizeUseCaseParam(
  value: string | undefined,
): TransactionUseCase | null {
  if (!value) return null;
  return (TRANSACTION_USE_CASE_VALUES as readonly string[]).includes(value)
    ? (value as TransactionUseCase)
    : null;
}

export function TransactionCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const { useCase } = useParams<{ useCase: string }>();
  const { isReady } = usePermissions();
  const canCreate = useCan(PermissionSlug.TRANSACTIONS_CREATE);

  if (isReady && !canCreate) {
    return (
      <AccessDeniedView
        title="Yangi tranzaktsiya"
        description="Tranzaktsiya yaratish uchun ruxsat yo'q"
        hint="'transactions.create' ruxsati kerak."
      />
    );
  }

  const resolved = normalizeUseCaseParam(useCase);
  if (!resolved) {
    navigate('/', { replace: true });
    return <></>;
  }

  const meta = TRANSACTION_USE_CASES[resolved];

  return (
    <div className="pb-6">
      <PageHeader title={meta.label} description={meta.description} showBack />
      <FormForUseCase
        useCase={resolved}
        onCreated={(id) =>
          navigate(`/transactions/${id}`, { replace: true })
        }
      />
    </div>
  );
}

function FormForUseCase({
  useCase,
  onCreated,
}: {
  useCase: TransactionUseCase;
  onCreated: (id: number) => void;
}): React.ReactElement {
  switch (useCase) {
    case 'sale':
      return <SaleForm onCreated={onCreated} />;
    case 'purchase':
      return <PurchaseForm onCreated={onCreated} />;
    case 'credit-sale':
      return <CreditSaleForm onCreated={onCreated} />;
    case 'borrow':
      return <BorrowForm onCreated={onCreated} />;
    case 'transfer':
      return <TransferForm onCreated={onCreated} />;
    case 'correction':
      return <AdjustmentForm onCreated={onCreated} />;
  }
}
