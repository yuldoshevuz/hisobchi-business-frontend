export interface CurrencyRate {
  code: string;
  numericCode: string;
  /** How many units of `code` the `rate` value applies to. Usually 1, but
   *  IDR / IRR / VND etc. quote the rate per 10 units. Front-end conversion
   *  helpers must divide `rate` by `nominal` before multiplying by the amount. */
  nominal: number;
  /** UZS amount for `nominal` units of `code`. */
  rate: string;
  diff: string;
  nameUz: string;
  nameUzC: string;
  nameRu: string;
  nameEn: string;
  rateDate: string;
}
