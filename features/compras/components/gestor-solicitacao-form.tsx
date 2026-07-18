"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { FormToast } from "@/components/ui/form-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { createItem } from "@/features/compras/actions/item-actions";
import type { ItemActionState } from "@/features/compras/actions/item-actions";
import { createSolicitacao } from "@/features/compras/actions/purchase-actions";
import { useItemSearch, type ItemSuggestion } from "@/hooks/use-item-search";

const MAX_ANEXOS = 2;

export function GestorSolicitacaoForm({
  obras,
  units,
  currentUser,
}: {
  obras: Array<{ id: string; nome: string }>;
  units: Array<{ id: string; nome: string }>;
  currentUser: { id: string; nome: string };
}) {
  const [state, action] = useActionState(createSolicitacao, {});
  const [itemState, itemAction] = useActionState(
    createItem,
    {} as ItemActionState,
  );

  const [obraId, setObraId] = useState("");
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

  const [anexosPreview, setAnexosPreview] = useState<string[]>([]);
  const [anexosWarning, setAnexosWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAnexosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    anexosPreview.forEach((url) => URL.revokeObjectURL(url));

    if (files.length > MAX_ANEXOS) {
      setAnexosWarning(`Envie no máximo ${MAX_ANEXOS} fotos.`);
      const limited = files.slice(0, MAX_ANEXOS);
      const dataTransfer = new DataTransfer();
      limited.forEach((file) => dataTransfer.items.add(file));
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }
      setAnexosPreview(limited.map((file) => URL.createObjectURL(file)));
      return;
    }

    setAnexosWarning(null);
    setAnexosPreview(files.map((file) => URL.createObjectURL(file)));
  }

  return (
    <form id="gestor-solicitacao-form" action={action} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="obra_id">Obra</Label>
          <select
            id="obra_id"
            name="obra_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required
            value={obraId}
            onChange={(event) => setObraId(event.target.value)}
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
          <Label>Responsável</Label>
          <input
            type="hidden"
            name="responsavel_obra_id"
            value={currentUser.id}
          />
          <p className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
            {currentUser.nome}
          </p>
        </div>
        <DatePickerField
          name="data_necessidade"
          placeholder="Data para entrega"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacao">Observações</Label>
        <textarea
          id="observacao"
          name="observacao"
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-base font-semibold">Insumo</h2>

        <input type="hidden" name="item_0_item_id" value={selectedItemId} />
        <input type="hidden" name="item_0_descricao" value={query} />

        <div className="space-y-2">
          <Label htmlFor="insumo_busca">Nome do insumo</Label>
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
                if (event.target === document.getElementById("insumo_busca")) {
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
                        form="gestor-solicitacao-form"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="unidade_id">Unidade</Label>
                        <select
                          id="unidade_id"
                          name="unidade_id"
                          form="gestor-solicitacao-form"
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
                        form="gestor-solicitacao-form"
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
            <Label htmlFor="item_0_quantidade">Quantidade</Label>
            <Input
              id="item_0_quantidade"
              name="item_0_quantidade"
              inputMode="decimal"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="item_0_unidade">Unidade</Label>
            <Input
              id="item_0_unidade"
              name="item_0_unidade"
              value={unidade}
              onChange={(event) => setUnidade(event.target.value)}
              required
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O centro de custo é definido pelo compras/adm antes de enviar para
          cotação.
        </p>
        <div className="space-y-1">
          <Label htmlFor="item_0_observacao">Observação do insumo</Label>
          <Input id="item_0_observacao" name="item_0_observacao" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anexos">Fotos (até {MAX_ANEXOS})</Label>
        <Input
          id="anexos"
          name="anexos"
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleAnexosChange}
        />
        {anexosWarning ? (
          <p className="text-sm text-destructive">{anexosWarning}</p>
        ) : null}
        {anexosPreview.length > 0 ? (
          <div className="flex gap-2">
            {anexosPreview.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt="Pré-visualização"
                className="size-20 rounded-md border object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <FormToast message={state.message} />
      <Button type="submit">Criar solicitação</Button>
    </form>
  );
}
