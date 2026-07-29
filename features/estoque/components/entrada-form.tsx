"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { registrarEntradaEstoque } from "@/features/estoque/actions";
import { useItemSearch } from "@/hooks/use-item-search";

export function EntradaForm() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(registrarEntradaEstoque, {});
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoItemNome, setNovoItemNome] = useState("");
  const {
    query,
    selectedItemId,
    suggestions,
    loading,
    popoverOpen,
    setPopoverOpen,
    handleQueryChange,
    selectItem,
    setQuery,
    reset,
  } = useItemSearch();

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setCriandoNovo(false);
      setNovoItemNome("");
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function iniciarCriacaoNovo() {
    setNovoItemNome(query.trim());
    setCriandoNovo(true);
    setPopoverOpen(false);
  }

  function voltarParaBusca() {
    setCriandoNovo(false);
    setNovoItemNome("");
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Nova entrada
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova entrada de estoque</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="item_id" value={selectedItemId} />
          {criandoNovo ? (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Novo insumo</p>
                <button
                  type="button"
                  onClick={voltarParaBusca}
                  className="text-xs text-muted-foreground underline"
                >
                  Buscar insumo existente
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="novo_item_nome">Nome do insumo</Label>
                <Input
                  id="novo_item_nome"
                  name="novo_item_nome"
                  placeholder="Ex.: Cimento 50kg"
                  value={novoItemNome}
                  onChange={(event) => setNovoItemNome(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade_nome">Unidade de medida</Label>
                <Input
                  id="unidade_nome"
                  name="unidade_nome"
                  placeholder="Ex.: un, sc, m³"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="insumo_busca">Insumo</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverAnchor asChild>
                  <Input
                    id="insumo_busca"
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
                      event.target === document.getElementById("insumo_busca")
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
                      {!loading &&
                      query.trim().length >= 2 &&
                      suggestions.length === 0 ? (
                        <CommandEmpty>Nenhum insumo encontrado.</CommandEmpty>
                      ) : null}
                      <CommandGroup>
                        {suggestions.map((item) => (
                          <CommandItem
                            key={item.id}
                            onSelect={() => selectItem(item)}
                          >
                            {item.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {query.trim().length >= 2 ? (
                        <CommandGroup>
                          <CommandItem onSelect={iniciarCriacaoNovo}>
                            + Criar novo insumo &quot;{query.trim()}&quot;
                          </CommandItem>
                        </CommandGroup>
                      ) : null}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              name="quantidade"
              inputMode="decimal"
              placeholder="0,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preco_unitario">Valor unitário (R$)</Label>
            <Input
              id="preco_unitario"
              name="preco_unitario"
              inputMode="decimal"
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Preencha quando o insumo entrou sem passar por cotação (compra
              avulsa, doação etc.).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input
              id="motivo"
              name="motivo"
              placeholder="Ex.: sobra de obra, compra estocada..."
            />
          </div>
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <FormToast message={state.message} />
          <Button
            type="submit"
            className="w-full"
            disabled={!selectedItemId && !(criandoNovo && novoItemNome.trim())}
          >
            Registrar entrada
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
