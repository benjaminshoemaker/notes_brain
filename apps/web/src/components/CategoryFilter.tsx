import { CATEGORIES, type Category } from "@notesbrain/shared";

type Props = {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
};

function formatLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button
        type="button"
        aria-pressed={selectedCategory === null}
        onClick={() => onSelectCategory(null)}
      >
        All
      </button>

      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={selectedCategory === category}
          onClick={() => onSelectCategory(category)}
        >
          {formatLabel(category)}
        </button>
      ))}
    </div>
  );
}

