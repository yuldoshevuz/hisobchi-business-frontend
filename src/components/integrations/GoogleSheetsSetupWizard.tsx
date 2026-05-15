import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/modal';
import { SpreadsheetPicker } from './SpreadsheetPicker';
import { MappingEditor } from './MappingEditor';
import { SyncLogsList } from './SyncLogsList';
import type { IntegrationStatus } from '@/types/google-sheets.types';
import { cn } from '@/lib/utils';

type Step = 'spreadsheet' | 'mappings' | 'logs';

interface Props {
  status: IntegrationStatus;
  onClose: () => void;
}

/**
 * Three-step wizard:
 *   1. Spreadsheet — pick the target spreadsheet (skipped if already chosen).
 *   2. Mappings — per transaction type, choose tab + column mapping.
 *   3. Logs — recent sync attempts so the admin can verify.
 *
 * The steps are independently navigable via a tab strip — the user can
 * always jump back to fix mappings or re-pick a spreadsheet without
 * starting over.
 */
export function GoogleSheetsSetupWizard({
  status,
  onClose,
}: Props): React.ReactElement {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(
    status.spreadsheetId ? 'mappings' : 'spreadsheet',
  );

  return (
    <Modal
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={t('integrations.sheets.wizard.title')}
      description={t('integrations.sheets.wizard.subtitle')}
      contentClassName="md:rounded-2xl md:bottom-auto md:top-12 md:left-1/2 md:-translate-x-1/2 md:w-[640px]"
    >
      <div className="-mx-1 flex gap-1 rounded-xl bg-muted p-1">
        <TabButton active={step === 'spreadsheet'} onClick={() => setStep('spreadsheet')}>
          {t('integrations.sheets.wizard.step.spreadsheet')}
        </TabButton>
        <TabButton active={step === 'mappings'} onClick={() => setStep('mappings')}>
          {t('integrations.sheets.wizard.step.mappings')}
        </TabButton>
        <TabButton active={step === 'logs'} onClick={() => setStep('logs')}>
          {t('integrations.sheets.wizard.step.logs')}
        </TabButton>
      </div>

      <div className="mt-4">
        {step === 'spreadsheet' ? (
          <SpreadsheetPicker
            status={status}
            onPicked={() => setStep('mappings')}
          />
        ) : null}
        {step === 'mappings' ? <MappingEditor status={status} /> : null}
        {step === 'logs' ? <SyncLogsList /> : null}
      </div>
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'press flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}
