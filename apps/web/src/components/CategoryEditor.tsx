import { CATEGORIES, type Category } from "@notesbrain/shared";

import { useUpdateCategory } from "../hooks/useUpdateCategory";

type Props = {
  noteId: string;
  value: Category;
  onClose: () => void;
};

export function CategoryEditor({ noteId, value, onClose }: Props) {
  const updateCategory = useUpdateCategory();

  function handleChange(next: Category) {
    onClose();
    updateCategory.mutate({ noteId, category: next });
  }

  return (
    <select
      aria-label="Edit note category"
      value={value}
      onChange={(event) => handleChange(event.target.value as Category)}
      autoFocus
    >
      {CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
