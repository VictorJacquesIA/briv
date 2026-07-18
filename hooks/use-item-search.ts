"use client";

import { useEffect, useState } from "react";

import { searchItemsAction } from "@/features/compras/actions/item-actions";

export type ItemSuggestion = {
  id: string;
  nome: string;
  unidade_id: string | null;
  unidade: { id: string; nome: string } | null;
};

/**
 * Busca com debounce (250ms) no catálogo global de itens, usada pelo
 * combobox de insumo em vários formulários (nova solicitação, entrada e
 * saída de estoque).
 */
export function useItemSearch() {
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (selectedItemId || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setLoading(true);
    const timeout = setTimeout(async () => {
      const results = await searchItemsAction(trimmed);
      if (active) {
        setSuggestions(results);
        setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, selectedItemId]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedItemId("");
    setPopoverOpen(true);
  }

  function selectItem(item: ItemSuggestion) {
    setSelectedItemId(item.id);
    setQuery(item.nome);
    setPopoverOpen(false);
  }

  function reset() {
    setQuery("");
    setSelectedItemId("");
    setSuggestions([]);
  }

  return {
    query,
    setQuery,
    selectedItemId,
    setSelectedItemId,
    suggestions,
    loading,
    popoverOpen,
    setPopoverOpen,
    handleQueryChange,
    selectItem,
    reset,
  };
}
