type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: Props) {
  return (
    <input
      aria-label="Search"
      type="search"
      placeholder="Search notes…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

