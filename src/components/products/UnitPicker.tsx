import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectField } from '@/components/transactions/forms/form-primitives';
import {
  DEFAULT_UNIT_OF_MEASURE,
  UNIT_OF_MEASURE_VALUES,
  type UnitOfMeasure,
} from '@/types/product.types';

interface UnitPickerProps {
  /** Currently selected unit. Falls back to `piece` when null/undefined. */
  value: UnitOfMeasure | null;
  onChange: (next: UnitOfMeasure) => void;
  /** Override the field label. Defaults to `t('units.label')`. */
  label?: string;
  /** Form id propagated to the underlying SelectField. */
  id?: string;
}

/**
 * Searchable picker over the full `UnitOfMeasure` catalogue. Labels are
 * resolved from the tenant locale (`units.<key>` for full name,
 * `units.short.<key>` for the compact suffix). The user can search by
 * either form — SelectField does a substring match against
 * `option.label` AND `option.subtitle`.
 *
 * Returns the canonical English enum key — the wire format that the
 * backend / AI agree on. Defaults to `piece` (dona) when the caller
 * passes null, matching the schema default.
 */
export function UnitPicker({
  value,
  onChange,
  label,
  id = 'product-unit',
}: UnitPickerProps): React.ReactElement {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      UNIT_OF_MEASURE_VALUES.map((unit) => ({
        value: unit,
        label: t(`units.${unit}` as const),
        description: t(`units.short.${unit}` as const),
      })),
    [t],
  );

  return (
    <SelectField<UnitOfMeasure>
      id={id}
      label={label ?? t('units.label')}
      value={value ?? DEFAULT_UNIT_OF_MEASURE}
      onChange={(next) => onChange(next ?? DEFAULT_UNIT_OF_MEASURE)}
      options={options}
      searchThreshold={6}
    />
  );
}
