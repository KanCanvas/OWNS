"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "@/app/context/SearchProvider";
import { formatPrice } from "../lib/formatPrice";

export default function PizzaSearch() {
  const listboxId = useId();
  const rootRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    suggestions,
  } = useSearch();

  const showSuggestions =
    isSearchOpen && searchQuery.trim().length > 0 && suggestions.length > 0;

  const goToHomeIfNeeded = () => {
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleSelect = (name) => {
    setSearchQuery(name);
    setIsSearchOpen(false);
    goToHomeIfNeeded();
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [setIsSearchOpen]);

  return (
    <div className="search-wrap" ref={rootRef}>
      <label className="search-field" aria-label="Поиск пиццы">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          type="search"
          placeholder="Поиск пиццы..."
          value={searchQuery}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-autocomplete="list"
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsSearchOpen(true);
            goToHomeIfNeeded();
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsSearchOpen(false);
            }
          }}
        />
      </label>

      {showSuggestions ? (
        <ul className="search-dropdown" id={listboxId} role="listbox">
          {suggestions.map((pizza) => (
            <li key={pizza.id} role="option">
              <button
                type="button"
                className="search-option"
                onClick={() => handleSelect(pizza.name)}
              >
                <span className="search-option-name">{pizza.name}</span>
                <span className="search-option-meta">
                  {pizza.size} · {formatPrice(pizza.price)} ₸
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
