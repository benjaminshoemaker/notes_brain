import type { Category } from "@notesbrain/shared";
import { CATEGORIES } from "@notesbrain/shared";

type Props = {
  value: Category | "";
  onChange: (value: Category | "") => void;
  label?: string;
};

export function CategorySelect({ value, onChange, label = "Category (optional)" }: Props) {
  return (
    <label className="form-grid">
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select
        aria-label="Category"
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value as Category | "")}
      >
        <option value="">Uncategorized</option>
        {CATEGORIES.filter((category) => category !== "uncategorized").map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}
