const DONATIONS_URL = "https://nanosabo.github.io/xocs-imgs/donations.json";

export interface Donation {
  id: string;
  time: number;
  /** Major currency units, hryvnias. */
  amount: number;
  comment: string;
}

export interface DonationFeed {
  donations: Donation[];
}

const toMajor = (value: number, unit: string) =>
  unit === "kopecks" ? value / 100 : value;

const asMoney = (value: unknown, unit: string): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return toMajor(value, unit);
};

export const loadDonations = async (): Promise<DonationFeed> => {
  const response = await fetch(DONATIONS_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`donations ${response.status}`);
  }

  const data = (await response.json()) as {
    amountUnit?: unknown;
    donations?: unknown;
  };
  const unit = typeof data.amountUnit === "string" ? data.amountUnit : "";
  const rows = Array.isArray(data.donations) ? data.donations : [];

  const donations = rows.flatMap((row, index) => {
    if (!row || typeof row !== "object") return [];

    const entry = row as {
      id?: unknown;
      time?: unknown;
      amount?: unknown;
      comment?: unknown;
    };
    const amount = asMoney(entry.amount, unit);

    if (amount === null || amount <= 0) return [];

    const time = Date.parse(typeof entry.time === "string" ? entry.time : "");

    return [
      {
        id: typeof entry.id === "string" && entry.id ? entry.id : `donation-${index}`,
        time: Number.isFinite(time) ? time : 0,
        amount,
        comment: typeof entry.comment === "string" ? entry.comment.trim() : "",
      },
    ];
  });

  donations.sort((left, right) => right.time - left.time);

  return { donations };
};
