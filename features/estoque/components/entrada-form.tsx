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
  const {
    query,
    selectedItemId,
    suggestions,
    loading,
    popoverOpen,
    setPopoverOpen,
    handleQueryChange,
    selectItem,
    reset,
  } = useItemSearch();

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
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
          <Button type="submit" className="w-full" disabled={!selectedItemId}>
            Registrar entrada
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
