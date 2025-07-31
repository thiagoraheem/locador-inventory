import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategoryFilterProps {
  value?: string;
  onChange?: (value: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (value: string) => void;
  placeholder?: string;
}

export default function CategoryFilter({ 
  value, 
  onChange, 
  selectedCategory, 
  onCategoryChange,
  placeholder = "Todas as categorias"
}: CategoryFilterProps) {
  const actualValue = value || selectedCategory || "all";
  const actualOnChange = onChange || onCategoryChange || (() => {});

  return (
    <Select value={actualValue} onValueChange={actualOnChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as categorias</SelectItem>
        {/* Categories will be loaded dynamically */}
      </SelectContent>
    </Select>
  );
}