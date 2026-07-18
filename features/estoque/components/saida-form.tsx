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
import { registrarSaidaEstoque } from "@/features/estoque/actions";
import { useItemSearch } from "@/hooks/use-item-search";

export function SaidaForm({
  obras,
}: {
  obras: Array<{ id: string; nome: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(registrarSaidaEstoque, {});
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
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Nova saída
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirada manual de estoque</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="item_id" value={selectedItemId} />
          <div className="space-y-2">
            <Label htmlFor="insumo_busca_saida">Insumo</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverAnchor asChild>
                <Input
                  id="insumo_busca_saida"
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
                    document.getElementById("insumo_busca_saida")
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
            <Label htmlFor="obra_id_saida">Obra de destino</Label>
            <select
              id="obra_id_saida"
              name="obra_id"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="">Selecione</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantidade_saida">Quantidade</Label>
            <Input
              id="quantidade_saida"
              name="quantidade"
              inputMode="decimal"
              placeholder="0,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo_saida">Motivo</Label>
            <Input
              id="motivo_saida"
              name="motivo"
              placeholder="Ex.: consumo direto na obra, ajuste de contagem..."
            />
          </div>
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <FormToast message={state.message} />
          <Button type="submit" className="w-full" disabled={!selectedItemId}>
            Registrar saída
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
