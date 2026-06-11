"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { filterPizzas, getSearchSuggestions, pizzas } from "../../lib/pizzas";

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const suggestions = useMemo(
    () => getSearchSuggestions(searchQuery),
    [searchQuery]
  );

  const filteredPizzas = useMemo(
    () => filterPizzas(searchQuery),
    [searchQuery]
  );

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        suggestions,
        filteredPizzas,
        pizzas,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
