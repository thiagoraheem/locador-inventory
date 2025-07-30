import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLayout } from "./main-layout";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "Dashboard", subtitle = "Visão geral do sistema de inventário" }: HeaderProps) {
  const { toggleSidebar, isMobile } = useLayout();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch all data for search when query changes
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    enabled: searchQuery.length > 2
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    enabled: searchQuery.length > 2
  });

  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    enabled: searchQuery.length > 2
  });

  const { data: companies } = useQuery({
    queryKey: ['/api/companies'],
    enabled: searchQuery.length > 2
  });

  const { data: stockItems } = useQuery({
    queryKey: ['/api/stock-items'],
    enabled: searchQuery.length > 2
  });

  useEffect(() => {
    if (searchQuery.length > 2) {
      const results = [];
      const query = searchQuery.toLowerCase();

      // Search products
      if (products) {
        products.filter(item => 
          item.name?.toLowerCase().includes(query) || 
          item.sku?.toLowerCase().includes(query)
        ).forEach(item => results.push({
          type: 'Produto',
          title: item.name,
          subtitle: `SKU: ${item.sku}`,
          route: '/products'
        }));
      }

      // Search categories
      if (categories) {
        categories.filter(item => 
          item.name?.toLowerCase().includes(query)
        ).forEach(item => results.push({
          type: 'Categoria',
          title: item.name,
          subtitle: 'Categoria de produto',
          route: '/categories'
        }));
      }

      // Search locations
      if (locations) {
        locations.filter(item => 
          item.name?.toLowerCase().includes(query) ||
          item.code?.toLowerCase().includes(query)
        ).forEach(item => results.push({
          type: 'Local',
          title: item.name,
          subtitle: `Código: ${item.code}`,
          route: '/locations'
        }));
      }

      // Search companies
      if (companies) {
        companies.filter(item => 
          item.name?.toLowerCase().includes(query)
        ).forEach(item => results.push({
          type: 'Empresa',
          title: item.name,
          subtitle: 'Empresa cadastrada',
          route: '/companies'
        }));
      }

      // Search stock items
      if (stockItems) {
        stockItems.filter(item => 
          item.description?.toLowerCase().includes(query) ||
          item.assetTag?.toLowerCase().includes(query)
        ).forEach(item => results.push({
          type: 'Patrimônio',
          title: item.description,
          subtitle: `Tag: ${item.assetTag}`,
          route: '/stock-items'
        }));
      }

      setSearchResults(results.slice(0, 8)); // Limit to 8 results
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery, products, categories, locations, companies, stockItems]);

  const handleResultClick = (route) => {
    setLocation(route);
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <header className="bg-background shadow-sm border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground hidden md:block">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <ThemeToggle />
          <div className="relative">
            <Input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              onFocus={() => searchQuery.length > 2 && setShowResults(true)}
              className="w-48 md:w-64 pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleResultClick(result.route)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {result.type}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
