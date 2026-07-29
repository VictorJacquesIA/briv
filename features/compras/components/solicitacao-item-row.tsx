"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { createItem } from "@/features/compras/actions/item-actions";
import type { ItemActionState } from "@/features/compras/actions/item-actions";
import { useItemSearch, type ItemSuggestion } from "@/hooks/use-item-search";

// Uma linha de insumo do formulário de solicitação — busca com autocomplete
// + "Registrar insumo" inline, igual ao formulário do gestor. Cada linha
// tem sua própria instância de hook/useActionState (não podem viver num
// .map), por isso é um componente à parte; o pai (SolicitacaoForm) controla
// quantas linhas existem via botão "Adicionar item".
export function SolicitacaoItemRow({
  index,
  formId,
  units,
  onRemove,
}: {
  index: number;
  formId: string;
  units: Array<{ id: string; nome: string }>;
  onRemove?: () => void;
}) {
  const [itemState, itemAction] = useActionState(
    createItem,
    {} as ItemActionState,
  );
  const [unidade, setUnidade] = useState("");
  const [showRegistrar, setShowRegistrar] = useState(false);
  const [novoUnidadeId, setNovoUnidadeId] = useState("");

  const {
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
  } = useItemSearch();

  useEffect(() => {
    if (itemState?.id && itemState?.nome) {
      setSelectedItemId(itemState.id);
      setQuery(itemState.nome);
      const unidadeNome =
        units.find((unit) => unit.id === novoUnidadeId)?.nome ?? "";
      setUnidade(unidadeNome);
      setShowRegistrar(false);
      setPopoverOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemState]);

  function handleSelect(item: ItemSuggestion) {
    selectItem(item);
    setUnidade(item.unidade?.nome ?? "");
    setShowRegistrar(false);
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Insumo {index + 1}</h2>
        {onRemove ? (
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={onRemove}
          >
            Remover
          </button>
        ) : null}
      </div>

      <input
        type="hidden"
        name={`item_${index}_item_id`}
        value={selectedItemId}
      />
      <input type="hidden" name={`item_${index}_descricao`} value={query} />

      <div className="space-y-2">
        <Label htmlFor={`insumo_busca_${index}`}>Nome do insumo</Label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverAnchor asChild>
            <Input
              id={`insumo_busca_${index}`}
              autoComplete="off"
              placeholder="Comece a digitar..."
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="w-[320px] p-0"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (
                event.target ===
                document.getElementById(`insumo_busca_${index}`)
              ) {
                event.preventDefault();
              }
            }}
          >
            <Command shouldFilter={false}>
              <CommandList>
                {loading ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Buscando...
                  </div>
                ) : null}
                <CommandGroup>
                  {suggestions.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                    >
                      {item.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            {!loading &&
            query.trim().length >= 2 &&
            suggestions.length === 0 ? (
              <div className="space-y-2 border-t p-2">
                <p className="text-sm text-muted-foreground">
                  Nenhum insumo encontrado.
                </p>
                <button
                  type="button"
                  className="text-sm text-primary underline"
                  onClick={() => setShowRegistrar((prev) => !prev)}
                >
                  {showRegistrar ? "Cancelar" : "Registrar insumo"}
                </button>
                {showRegistrar ? (
                  <div className="space-y-2 rounded-md border p-2">
                    <input
                      type="hidden"
                      name="item_nome"
                      value={query}
                      form={formId}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={`unidade_id_${index}`}>Unidade</Label>
                      <select
                        id={`unidade_id_${index}`}
                        name="unidade_id"
                        form={formId}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={novoUnidadeId}
                        onChange={(event) =>
                          setNovoUnidadeId(event.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    {itemState?.message ? (
                      <p className="text-sm text-muted-foreground">
                        {itemState.message}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      formAction={itemAction}
                      form={formId}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Salvar insumo
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`item_${index}_quantidade`}>Quantidade</Label>
          <Input
            id={`item_${index}_quantidade`}
            name={`item_${index}_quantidade`}
            inputMode="decimal"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`item_${index}_unidade`}>Unidade</Label>
          <Input
            id={`item_${index}_unidade`}
            name={`item_${index}_unidade`}
            value={unidade}
            onChange={(event) => setUnidade(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`item_${index}_observacao`}>Observação do insumo</Label>
        <Input
          id={`item_${index}_observacao`}
          name={`item_${index}_observacao`}
        />
      </div>
    </div>
  );
}
