// Tipos gerados via mcp__supabase__generate_typescript_types (Supabase project iguixokrvatlyajnldqv)
// Não editar manualmente — regenerar quando o schema mudar.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      aprovacoes: {
        Row: {
          aprovador_id: string | null;
          cliente_id: string;
          comentario: string | null;
          created_at: string;
          decided_at: string | null;
          fornecedor_escolhido_id: string | null;
          gestor_email: string | null;
          gestor_nome: string | null;
          id: string;
          solicitacao_id: string;
          status: Database["public"]["Enums"]["aprovacao_status"];
          updated_at: string;
        };
        Insert: {
          aprovador_id?: string | null;
          cliente_id: string;
          comentario?: string | null;
          created_at?: string;
          decided_at?: string | null;
          fornecedor_escolhido_id?: string | null;
          gestor_email?: string | null;
          gestor_nome?: string | null;
          id?: string;
          solicitacao_id: string;
          status?: Database["public"]["Enums"]["aprovacao_status"];
          updated_at?: string;
        };
        Update: {
          aprovador_id?: string | null;
          cliente_id?: string;
          comentario?: string | null;
          created_at?: string;
          decided_at?: string | null;
          fornecedor_escolhido_id?: string | null;
          gestor_email?: string | null;
          gestor_nome?: string | null;
          id?: string;
          solicitacao_id?: string;
          status?: Database["public"]["Enums"]["aprovacao_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aprovacoes_aprovador_id_fkey";
            columns: ["aprovador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aprovacoes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aprovacoes_fornecedor_escolhido_id_fkey";
            columns: ["fornecedor_escolhido_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aprovacoes_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      cacamba_eventos: {
        Row: {
          cacamba_id: string;
          cliente_id: string;
          created_at: string;
          id: string;
          observacao: string | null;
          responsavel_id: string | null;
          tipo: Database["public"]["Enums"]["cacamba_evento_tipo"];
        };
        Insert: {
          cacamba_id: string;
          cliente_id: string;
          created_at?: string;
          id?: string;
          observacao?: string | null;
          responsavel_id?: string | null;
          tipo: Database["public"]["Enums"]["cacamba_evento_tipo"];
        };
        Update: {
          cacamba_id?: string;
          cliente_id?: string;
          created_at?: string;
          id?: string;
          observacao?: string | null;
          responsavel_id?: string | null;
          tipo?: Database["public"]["Enums"]["cacamba_evento_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "cacamba_eventos_cacamba_id_fkey";
            columns: ["cacamba_id"];
            isOneToOne: false;
            referencedRelation: "cacambas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cacamba_eventos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cacamba_eventos_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cacambas: {
        Row: {
          acao_pendente:
            Database["public"]["Enums"]["cacamba_acao_pendente"] | null;
          cliente_id: string;
          created_at: string;
          criado_por: string | null;
          id: string;
          obra_id: string;
          observacao: string | null;
          orcamento_item_id: string | null;
          status: Database["public"]["Enums"]["cacamba_status"];
          tipo: string;
          updated_at: string;
          valor: number | null;
        };
        Insert: {
          acao_pendente?:
            Database["public"]["Enums"]["cacamba_acao_pendente"] | null;
          cliente_id: string;
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          obra_id: string;
          observacao?: string | null;
          orcamento_item_id?: string | null;
          status?: Database["public"]["Enums"]["cacamba_status"];
          tipo?: string;
          updated_at?: string;
          valor?: number | null;
        };
        Update: {
          acao_pendente?:
            Database["public"]["Enums"]["cacamba_acao_pendente"] | null;
          cliente_id?: string;
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          obra_id?: string;
          observacao?: string | null;
          orcamento_item_id?: string | null;
          status?: Database["public"]["Enums"]["cacamba_status"];
          tipo?: string;
          updated_at?: string;
          valor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cacambas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cacambas_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cacambas_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cacambas_orcamento_item_id_fkey";
            columns: ["orcamento_item_id"];
            isOneToOne: false;
            referencedRelation: "obra_orcamento_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cacambas_orcamento_item_id_fkey";
            columns: ["orcamento_item_id"];
            isOneToOne: false;
            referencedRelation: "v_obra_orcamento_realizado";
            referencedColumns: ["orcamento_item_id"];
          },
        ];
      };
      clientes: {
        Row: {
          ativo: boolean;
          cep: string | null;
          cidade: string | null;
          cnpj: string | null;
          created_at: string;
          email_nfe: string | null;
          endereco: string | null;
          id: string;
          inscricao_estadual: string | null;
          nome_fantasia: string | null;
          razao_social: string;
          telefone: string | null;
          uf: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          created_at?: string;
          email_nfe?: string | null;
          endereco?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          nome_fantasia?: string | null;
          razao_social: string;
          telefone?: string | null;
          uf?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          created_at?: string;
          email_nfe?: string | null;
          endereco?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          nome_fantasia?: string | null;
          razao_social?: string;
          telefone?: string | null;
          uf?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      colaboradores: {
        Row: {
          ativo: boolean;
          chave_pix: string | null;
          cliente_id: string;
          created_at: string;
          dados_bancarios: string | null;
          funcao: string | null;
          id: string;
          nome: string;
          observacao: string | null;
          telefone: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          chave_pix?: string | null;
          cliente_id: string;
          created_at?: string;
          dados_bancarios?: string | null;
          funcao?: string | null;
          id?: string;
          nome: string;
          observacao?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          chave_pix?: string | null;
          cliente_id?: string;
          created_at?: string;
          dados_bancarios?: string | null;
          funcao?: string | null;
          id?: string;
          nome?: string;
          observacao?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "colaboradores_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      contratos_mo: {
        Row: {
          cliente_id: string;
          colaborador_id: string;
          created_at: string;
          criado_por: string | null;
          descricao: string;
          id: string;
          obra_id: string;
          status: Database["public"]["Enums"]["contrato_mo_status"];
          updated_at: string;
          valor_total: number;
        };
        Insert: {
          cliente_id: string;
          colaborador_id: string;
          created_at?: string;
          criado_por?: string | null;
          descricao: string;
          id?: string;
          obra_id: string;
          status?: Database["public"]["Enums"]["contrato_mo_status"];
          updated_at?: string;
          valor_total: number;
        };
        Update: {
          cliente_id?: string;
          colaborador_id?: string;
          created_at?: string;
          criado_por?: string | null;
          descricao?: string;
          id?: string;
          obra_id?: string;
          status?: Database["public"]["Enums"]["contrato_mo_status"];
          updated_at?: string;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contratos_mo_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contratos_mo_colaborador_id_fkey";
            columns: ["colaborador_id"];
            isOneToOne: false;
            referencedRelation: "colaboradores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contratos_mo_colaborador_id_fkey";
            columns: ["colaborador_id"];
            isOneToOne: false;
            referencedRelation: "v_colaborador_saldo";
            referencedColumns: ["colaborador_id"];
          },
          {
            foreignKeyName: "contratos_mo_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contratos_mo_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_itens: {
        Row: {
          cotacao_id: string;
          created_at: string;
          id: string;
          item_nao_cotado: boolean;
          observacao: string | null;
          prazo_entrega_dias: number | null;
          preco_unitario: number | null;
          solicitacao_item_id: string;
          updated_at: string;
          valor_total: number;
        };
        Insert: {
          cotacao_id: string;
          created_at?: string;
          id?: string;
          item_nao_cotado?: boolean;
          observacao?: string | null;
          prazo_entrega_dias?: number | null;
          preco_unitario?: number | null;
          solicitacao_item_id: string;
          updated_at?: string;
          valor_total?: number;
        };
        Update: {
          cotacao_id?: string;
          created_at?: string;
          id?: string;
          item_nao_cotado?: boolean;
          observacao?: string | null;
          prazo_entrega_dias?: number | null;
          preco_unitario?: number | null;
          solicitacao_item_id?: string;
          updated_at?: string;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_itens_cotacao_id_fkey";
            columns: ["cotacao_id"];
            isOneToOne: false;
            referencedRelation: "cotacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacao_itens_solicitacao_item_id_fkey";
            columns: ["solicitacao_item_id"];
            isOneToOne: false;
            referencedRelation: "solicitacao_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacoes: {
        Row: {
          arquivo_content_type: string | null;
          arquivo_path: string | null;
          cliente_id: string;
          created_at: string;
          extracao_ia: Json | null;
          forma_pagamento: string | null;
          fornecedor_id: string;
          frete: number | null;
          id: string;
          observacao: string | null;
          observacoes_gerais: string | null;
          prazo_dias: number | null;
          solicitacao_id: string;
          status: Database["public"]["Enums"]["cotacao_status"];
          total_fornecedor: number;
          updated_at: string;
          validade: string | null;
          validado_at: string | null;
          validado_por: string | null;
        };
        Insert: {
          arquivo_content_type?: string | null;
          arquivo_path?: string | null;
          cliente_id: string;
          created_at?: string;
          extracao_ia?: Json | null;
          forma_pagamento?: string | null;
          fornecedor_id: string;
          frete?: number | null;
          id?: string;
          observacao?: string | null;
          observacoes_gerais?: string | null;
          prazo_dias?: number | null;
          solicitacao_id: string;
          status?: Database["public"]["Enums"]["cotacao_status"];
          total_fornecedor?: number;
          updated_at?: string;
          validade?: string | null;
          validado_at?: string | null;
          validado_por?: string | null;
        };
        Update: {
          arquivo_content_type?: string | null;
          arquivo_path?: string | null;
          cliente_id?: string;
          created_at?: string;
          extracao_ia?: Json | null;
          forma_pagamento?: string | null;
          fornecedor_id?: string;
          frete?: number | null;
          id?: string;
          observacao?: string | null;
          observacoes_gerais?: string | null;
          prazo_dias?: number | null;
          solicitacao_id?: string;
          status?: Database["public"]["Enums"]["cotacao_status"];
          total_fornecedor?: number;
          updated_at?: string;
          validade?: string | null;
          validado_at?: string | null;
          validado_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cotacoes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacoes_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacoes_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacoes_validado_por_fkey";
            columns: ["validado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estoque_itens: {
        Row: {
          cliente_id: string;
          created_at: string;
          id: string;
          item_id: string;
          quantidade_minima: number | null;
          updated_at: string;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          id?: string;
          item_id: string;
          quantidade_minima?: number | null;
          updated_at?: string;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          quantidade_minima?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estoque_itens_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estoque_itens_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      ferramentas: {
        Row: {
          ativo: boolean;
          cliente_id: string;
          codigo: string | null;
          created_at: string;
          id: string;
          nome: string;
          obra_atual_id: string | null;
          status: Database["public"]["Enums"]["ferramenta_status"];
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cliente_id: string;
          codigo?: string | null;
          created_at?: string;
          id?: string;
          nome: string;
          obra_atual_id?: string | null;
          status?: Database["public"]["Enums"]["ferramenta_status"];
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cliente_id?: string;
          codigo?: string | null;
          created_at?: string;
          id?: string;
          nome?: string;
          obra_atual_id?: string | null;
          status?: Database["public"]["Enums"]["ferramenta_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ferramentas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ferramentas_obra_atual_id_fkey";
            columns: ["obra_atual_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedores: {
        Row: {
          ativo: boolean;
          cliente_id: string;
          cnpj: string | null;
          contato: string | null;
          created_at: string;
          email: string | null;
          endereco: string | null;
          id: string;
          mensagem_template: string | null;
          nome_fantasia: string | null;
          razao_social: string;
          telefone: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          ativo?: boolean;
          cliente_id: string;
          cnpj?: string | null;
          contato?: string | null;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          id?: string;
          mensagem_template?: string | null;
          nome_fantasia?: string | null;
          razao_social: string;
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          ativo?: boolean;
          cliente_id?: string;
          cnpj?: string | null;
          contato?: string | null;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          id?: string;
          mensagem_template?: string | null;
          nome_fantasia?: string | null;
          razao_social?: string;
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedores_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      historico: {
        Row: {
          acao: string;
          actor_id: string | null;
          cliente_id: string | null;
          created_at: string;
          dados: Json;
          entidade: string;
          entidade_id: string;
          id: string;
          ip: string | null;
          status_anterior: string | null;
          status_novo: string | null;
          user_agent: string | null;
        };
        Insert: {
          acao: string;
          actor_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          dados?: Json;
          entidade: string;
          entidade_id: string;
          id?: string;
          ip?: string | null;
          status_anterior?: string | null;
          status_novo?: string | null;
          user_agent?: string | null;
        };
        Update: {
          acao?: string;
          actor_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          dados?: Json;
          entidade?: string;
          entidade_id?: string;
          id?: string;
          ip?: string | null;
          status_anterior?: string | null;
          status_novo?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historico_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historico_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          id: string;
          nome: string;
          unidade_id: string | null;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome: string;
          unidade_id?: string | null;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome?: string;
          unidade_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_unidade_id_fkey";
            columns: ["unidade_id"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["id"];
          },
        ];
      };
      lancamentos_mo: {
        Row: {
          cliente_id: string;
          colaborador_id: string;
          confirmado_at: string | null;
          confirmado_por: string | null;
          contrato_id: string | null;
          created_at: string;
          criado_por: string | null;
          descricao: string | null;
          id: string;
          obra_id: string;
          orcamento_item_id: string | null;
          qtd_diarias: number | null;
          status: Database["public"]["Enums"]["lancamento_mo_status"];
          tipo: Database["public"]["Enums"]["lancamento_mo_tipo"];
          updated_at: string;
          vale_aplicado_em: string | null;
          valor: number | null;
          valor_diaria: number | null;
        };
        Insert: {
          cliente_id: string;
          colaborador_id: string;
          confirmado_at?: string | null;
          confirmado_por?: string | null;
          contrato_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          descricao?: string | null;
          id?: string;
          obra_id: string;
          orcamento_item_id?: string | null;
          qtd_diarias?: number | null;
          status?: Database["public"]["Enums"]["lancamento_mo_status"];
          tipo: Database["public"]["Enums"]["lancamento_mo_tipo"];
          updated_at?: string;
          vale_aplicado_em?: string | null;
          valor?: number | null;
          valor_diaria?: number | null;
        };
        Update: {
          cliente_id?: string;
          colaborador_id?: string;
          confirmado_at?: string | null;
          confirmado_por?: string | null;
          contrato_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          descricao?: string | null;
          id?: string;
          obra_id?: string;
          orcamento_item_id?: string | null;
          qtd_diarias?: number | null;
          status?: Database["public"]["Enums"]["lancamento_mo_status"];
          tipo?: Database["public"]["Enums"]["lancamento_mo_tipo"];
          updated_at?: string;
          vale_aplicado_em?: string | null;
          valor?: number | null;
          valor_diaria?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_mo_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_colaborador_id_fkey";
            columns: ["colaborador_id"];
            isOneToOne: false;
            referencedRelation: "colaboradores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_colaborador_id_fkey";
            columns: ["colaborador_id"];
            isOneToOne: false;
            referencedRelation: "v_colaborador_saldo";
            referencedColumns: ["colaborador_id"];
          },
          {
            foreignKeyName: "lancamentos_mo_confirmado_por_fkey";
            columns: ["confirmado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contratos_mo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "v_contrato_mo_saldo";
            referencedColumns: ["contrato_id"];
          },
          {
            foreignKeyName: "lancamentos_mo_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_orcamento_item_id_fkey";
            columns: ["orcamento_item_id"];
            isOneToOne: false;
            referencedRelation: "obra_orcamento_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_mo_orcamento_item_id_fkey";
            columns: ["orcamento_item_id"];
            isOneToOne: false;
            referencedRelation: "v_obra_orcamento_realizado";
            referencedColumns: ["orcamento_item_id"];
          },
          {
            foreignKeyName: "lancamentos_mo_vale_aplicado_em_fkey";
            columns: ["vale_aplicado_em"];
            isOneToOne: false;
            referencedRelation: "lancamentos_mo";
            referencedColumns: ["id"];
          },
        ];
      };
      materiais: {
        Row: {
          ativo: boolean;
          categoria: string | null;
          cliente_id: string;
          codigo: string | null;
          created_at: string;
          descricao: string;
          id: string;
          unidade: string;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          categoria?: string | null;
          cliente_id: string;
          codigo?: string | null;
          created_at?: string;
          descricao: string;
          id?: string;
          unidade: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          categoria?: string | null;
          cliente_id?: string;
          codigo?: string | null;
          created_at?: string;
          descricao?: string;
          id?: string;
          unidade?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materiais_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      movimentacoes_estoque: {
        Row: {
          cliente_id: string;
          created_at: string;
          estoque_item_id: string;
          id: string;
          motivo: string | null;
          obra_id: string | null;
          preco_unitario: number | null;
          quantidade: number;
          responsavel_id: string | null;
          solicitacao_id: string | null;
          tipo: Database["public"]["Enums"]["movimentacao_estoque_tipo"];
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          estoque_item_id: string;
          id?: string;
          motivo?: string | null;
          obra_id?: string | null;
          preco_unitario?: number | null;
          quantidade: number;
          responsavel_id?: string | null;
          solicitacao_id?: string | null;
          tipo: Database["public"]["Enums"]["movimentacao_estoque_tipo"];
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          estoque_item_id?: string;
          id?: string;
          motivo?: string | null;
          obra_id?: string | null;
          preco_unitario?: number | null;
          quantidade?: number;
          responsavel_id?: string | null;
          solicitacao_id?: string | null;
          tipo?: Database["public"]["Enums"]["movimentacao_estoque_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_estoque_item_id_fkey";
            columns: ["estoque_item_id"];
            isOneToOne: false;
            referencedRelation: "estoque_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_estoque_item_id_fkey";
            columns: ["estoque_item_id"];
            isOneToOne: false;
            referencedRelation: "v_estoque_saldo";
            referencedColumns: ["estoque_item_id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      movimentacoes_ferramentas: {
        Row: {
          cliente_id: string;
          created_at: string;
          ferramenta_id: string;
          id: string;
          obra_id: string;
          observacao: string | null;
          responsavel_id: string | null;
          tipo: Database["public"]["Enums"]["movimentacao_ferramenta_tipo"];
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          ferramenta_id: string;
          id?: string;
          obra_id: string;
          observacao?: string | null;
          responsavel_id?: string | null;
          tipo: Database["public"]["Enums"]["movimentacao_ferramenta_tipo"];
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          ferramenta_id?: string;
          id?: string;
          obra_id?: string;
          observacao?: string | null;
          responsavel_id?: string | null;
          tipo?: Database["public"]["Enums"]["movimentacao_ferramenta_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_ferramentas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_ferramentas_ferramenta_id_fkey";
            columns: ["ferramenta_id"];
            isOneToOne: false;
            referencedRelation: "ferramentas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_ferramentas_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_ferramentas_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      obra_orcamento_itens: {
        Row: {
          categoria: string | null;
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          descricao: string;
          id: string;
          obra_id: string;
          tipo: Database["public"]["Enums"]["obra_orcamento_tipo"];
          updated_at: string;
          valor_orcado: number;
        };
        Insert: {
          categoria?: string | null;
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          descricao: string;
          id?: string;
          obra_id: string;
          tipo?: Database["public"]["Enums"]["obra_orcamento_tipo"];
          updated_at?: string;
          valor_orcado: number;
        };
        Update: {
          categoria?: string | null;
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          descricao?: string;
          id?: string;
          obra_id?: string;
          tipo?: Database["public"]["Enums"]["obra_orcamento_tipo"];
          updated_at?: string;
          valor_orcado?: number;
        };
        Relationships: [
          {
            foreignKeyName: "obra_orcamento_itens_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obra_orcamento_itens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obra_orcamento_itens_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
      obra_usuarios: {
        Row: {
          ativo: boolean;
          created_at: string;
          id: string;
          obra_id: string;
          papel_na_obra: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          obra_id: string;
          papel_na_obra?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          obra_id?: string;
          papel_na_obra?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "obra_usuarios_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obra_usuarios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      obras: {
        Row: {
          ativo: boolean;
          cliente_id: string;
          codigo: string | null;
          created_at: string;
          endereco: string | null;
          fase: Database["public"]["Enums"]["obra_fase"];
          id: string;
          nome: string;
          telefone_responsavel: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cliente_id: string;
          codigo?: string | null;
          created_at?: string;
          endereco?: string | null;
          fase?: Database["public"]["Enums"]["obra_fase"];
          id?: string;
          nome: string;
          telefone_responsavel?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cliente_id?: string;
          codigo?: string | null;
          created_at?: string;
          endereco?: string | null;
          fase?: Database["public"]["Enums"]["obra_fase"];
          id?: string;
          nome?: string;
          telefone_responsavel?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos: {
        Row: {
          autorizado_at: string | null;
          autorizado_por_email: string | null;
          autorizado_por_nome: string | null;
          cliente_id: string;
          created_at: string;
          data_prevista_entrega: string | null;
          emitido_at: string | null;
          emitido_por: string | null;
          fornecedor_id: string;
          id: string;
          local_entrega:
            Database["public"]["Enums"]["pedido_local_entrega"] | null;
          numero: string | null;
          pdf_path: string | null;
          pdf_url: string | null;
          prazo_confirmado_dias: number | null;
          recebido_em: string | null;
          recebido_por: string | null;
          retirada_autorizado_documento: string | null;
          retirada_autorizado_nome: string | null;
          retirada_destino_final:
            Database["public"]["Enums"]["pedido_local_entrega"] | null;
          solicitacao_id: string;
          status: Database["public"]["Enums"]["pedido_status"];
          updated_at: string;
          valor_total: number;
        };
        Insert: {
          autorizado_at?: string | null;
          autorizado_por_email?: string | null;
          autorizado_por_nome?: string | null;
          cliente_id: string;
          created_at?: string;
          data_prevista_entrega?: string | null;
          emitido_at?: string | null;
          emitido_por?: string | null;
          fornecedor_id: string;
          id?: string;
          local_entrega?:
            Database["public"]["Enums"]["pedido_local_entrega"] | null;
          numero?: string | null;
          pdf_path?: string | null;
          pdf_url?: string | null;
          prazo_confirmado_dias?: number | null;
          recebido_em?: string | null;
          recebido_por?: string | null;
          retirada_autorizado_documento?: string | null;
          retirada_autorizado_nome?: string | null;
          retirada_destino_final?:
            Database["public"]["Enums"]["pedido_local_entrega"] | null;
          solicitacao_id: string;
          status?: Database["public"]["Enums"]["pedido_status"];
          updated_at?: string;
          valor_total?: number;
        };
        Update: {
          autorizado_at?: string | null;
          autorizado_por_email?: string | null;
          autorizado_por_nome?: string | null;
          cliente_id?: string;
          created_at?: string;
          data_prevista_entrega?: string | null;
          emitido_at?: string | null;
          emitido_por?: string | null;
          fornecedor_id?: string;
          id?: string;
          local_entrega?:
            Database["public"]["Enums"]["pedido_local_entrega"] | null;
          numero?: string | null;
          pdf_path?: string | null;
          pdf_url?: string | null;
          prazo_confirmado_dias?: number | null;
          recebido_em?: string | null;
          recebido_por?: string | null;
          retirada_autorizado_documento?: string | null;
          retirada_autorizado_nome?: string | null;
          retirada_destino_final?:
            Database["public"]["Enums"]["pedido_local_entrega"] | null;
          solicitacao_id?: string;
          status?: Database["public"]["Enums"]["pedido_status"];
          updated_at?: string;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_emitido_por_fkey";
            columns: ["emitido_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_recebido_por_fkey";
            columns: ["recebido_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          ativo: boolean;
          cliente_id: string | null;
          created_at: string;
          foto_url: string | null;
          id: string;
          nome: string;
          role: Database["public"]["Enums"]["user_role"];
          telefone: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          ativo?: boolean;
          cliente_id?: string | null;
          created_at?: string;
          foto_url?: string | null;
          id: string;
          nome: string;
          role?: Database["public"]["Enums"]["user_role"];
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          ativo?: boolean;
          cliente_id?: string | null;
          created_at?: string;
          foto_url?: string | null;
          id?: string;
          nome?: string;
          role?: Database["public"]["Enums"]["user_role"];
          telefone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      requisicao_almox_itens: {
        Row: {
          created_at: string;
          estoque_item_id: string;
          id: string;
          quantidade_separada: number | null;
          quantidade_solicitada: number;
          requisicao_id: string;
          solicitacao_item_id: string;
        };
        Insert: {
          created_at?: string;
          estoque_item_id: string;
          id?: string;
          quantidade_separada?: number | null;
          quantidade_solicitada: number;
          requisicao_id: string;
          solicitacao_item_id: string;
        };
        Update: {
          created_at?: string;
          estoque_item_id?: string;
          id?: string;
          quantidade_separada?: number | null;
          quantidade_solicitada?: number;
          requisicao_id?: string;
          solicitacao_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requisicao_almox_itens_estoque_item_id_fkey";
            columns: ["estoque_item_id"];
            isOneToOne: false;
            referencedRelation: "estoque_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisicao_almox_itens_estoque_item_id_fkey";
            columns: ["estoque_item_id"];
            isOneToOne: false;
            referencedRelation: "v_estoque_saldo";
            referencedColumns: ["estoque_item_id"];
          },
          {
            foreignKeyName: "requisicao_almox_itens_requisicao_id_fkey";
            columns: ["requisicao_id"];
            isOneToOne: false;
            referencedRelation: "requisicoes_almox";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisicao_almox_itens_solicitacao_item_id_fkey";
            columns: ["solicitacao_item_id"];
            isOneToOne: false;
            referencedRelation: "solicitacao_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      requisicoes_almox: {
        Row: {
          cliente_id: string;
          created_at: string;
          criado_por: string | null;
          id: string;
          obra_id: string;
          separado_at: string | null;
          separado_por: string | null;
          solicitacao_id: string;
          status: Database["public"]["Enums"]["requisicao_almox_status"];
          updated_at: string;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          obra_id: string;
          separado_at?: string | null;
          separado_por?: string | null;
          solicitacao_id: string;
          status?: Database["public"]["Enums"]["requisicao_almox_status"];
          updated_at?: string;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          obra_id?: string;
          separado_at?: string | null;
          separado_por?: string | null;
          solicitacao_id?: string;
          status?: Database["public"]["Enums"]["requisicao_almox_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requisicoes_almox_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisicoes_almox_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisicoes_almox_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisicoes_almox_separado_por_fkey";
            columns: ["separado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisicoes_almox_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      short_links: {
        Row: {
          cliente_id: string;
          code: string;
          created_at: string;
          created_by: string | null;
          id: string;
          target_url: string;
        };
        Insert: {
          cliente_id: string;
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          target_url: string;
        };
        Update: {
          cliente_id?: string;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          target_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "short_links_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "short_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      solicitacao_anexos: {
        Row: {
          cliente_id: string;
          content_type: string | null;
          created_at: string;
          id: string;
          nome_arquivo: string;
          solicitacao_id: string;
          storage_path: string;
          tamanho_bytes: number | null;
          uploaded_by: string | null;
        };
        Insert: {
          cliente_id: string;
          content_type?: string | null;
          created_at?: string;
          id?: string;
          nome_arquivo: string;
          solicitacao_id: string;
          storage_path: string;
          tamanho_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Update: {
          cliente_id?: string;
          content_type?: string | null;
          created_at?: string;
          id?: string;
          nome_arquivo?: string;
          solicitacao_id?: string;
          storage_path?: string;
          tamanho_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "solicitacao_anexos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacao_anexos_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacao_anexos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      solicitacao_itens: {
        Row: {
          created_at: string;
          descricao: string;
          id: string;
          item_id: string | null;
          material_id: string | null;
          observacao: string | null;
          orcamento_item_id: string | null;
          quantidade: number;
          quantidade_estoque: number;
          solicitacao_id: string;
          unidade: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao: string;
          id?: string;
          item_id?: string | null;
          material_id?: string | null;
          observacao?: string | null;
          orcamento_item_id?: string | null;
          quantidade: number;
          quantidade_estoque?: number;
          solicitacao_id: string;
          unidade: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          id?: string;
          item_id?: string | null;
          material_id?: string | null;
          observacao?: string | null;
          orcamento_item_id?: string | null;
          quantidade?: number;
          quantidade_estoque?: number;
          solicitacao_id?: string;
          unidade?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solicitacao_itens_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacao_itens_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materiais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacao_itens_orcamento_item_id_fkey";
            columns: ["orcamento_item_id"];
            isOneToOne: false;
            referencedRelation: "obra_orcamento_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacao_itens_orcamento_item_id_fkey";
            columns: ["orcamento_item_id"];
            isOneToOne: false;
            referencedRelation: "v_obra_orcamento_realizado";
            referencedColumns: ["orcamento_item_id"];
          },
          {
            foreignKeyName: "solicitacao_itens_solicitacao_id_fkey";
            columns: ["solicitacao_id"];
            isOneToOne: false;
            referencedRelation: "solicitacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      solicitacoes: {
        Row: {
          aprovacao_token: string | null;
          aprovacao_token_expires_at: string | null;
          cancelada_at: string | null;
          cliente_id: string;
          codigo: string | null;
          created_at: string;
          data_necessidade: string | null;
          divergencia_estoque_at: string | null;
          estoque_decidido_at: string | null;
          finalizada_at: string | null;
          fornecedor_aprovado_id: string | null;
          id: string;
          justificativa_excecao: string | null;
          obra_id: string;
          observacao: string | null;
          pdf_gerado_at: string | null;
          pedido_enviado_at: string | null;
          prioridade: Database["public"]["Enums"]["prioridade_solicitacao"];
          responsavel_obra_id: string | null;
          solicitante_id: string;
          status: Database["public"]["Enums"]["solicitacao_status"];
          updated_at: string;
        };
        Insert: {
          aprovacao_token?: string | null;
          aprovacao_token_expires_at?: string | null;
          cancelada_at?: string | null;
          cliente_id: string;
          codigo?: string | null;
          created_at?: string;
          data_necessidade?: string | null;
          divergencia_estoque_at?: string | null;
          estoque_decidido_at?: string | null;
          finalizada_at?: string | null;
          fornecedor_aprovado_id?: string | null;
          id?: string;
          justificativa_excecao?: string | null;
          obra_id: string;
          observacao?: string | null;
          pdf_gerado_at?: string | null;
          pedido_enviado_at?: string | null;
          prioridade?: Database["public"]["Enums"]["prioridade_solicitacao"];
          responsavel_obra_id?: string | null;
          solicitante_id: string;
          status?: Database["public"]["Enums"]["solicitacao_status"];
          updated_at?: string;
        };
        Update: {
          aprovacao_token?: string | null;
          aprovacao_token_expires_at?: string | null;
          cancelada_at?: string | null;
          cliente_id?: string;
          codigo?: string | null;
          created_at?: string;
          data_necessidade?: string | null;
          divergencia_estoque_at?: string | null;
          estoque_decidido_at?: string | null;
          finalizada_at?: string | null;
          fornecedor_aprovado_id?: string | null;
          id?: string;
          justificativa_excecao?: string | null;
          obra_id?: string;
          observacao?: string | null;
          pdf_gerado_at?: string | null;
          pedido_enviado_at?: string | null;
          prioridade?: Database["public"]["Enums"]["prioridade_solicitacao"];
          responsavel_obra_id?: string | null;
          solicitante_id?: string;
          status?: Database["public"]["Enums"]["solicitacao_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solicitacoes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_fornecedor_aprovado_id_fkey";
            columns: ["fornecedor_aprovado_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_responsavel_obra_id_fkey";
            columns: ["responsavel_obra_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_solicitante_id_fkey";
            columns: ["solicitante_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      solicitacoes_desmobilizacao: {
        Row: {
          cliente_id: string;
          concluido_at: string | null;
          concluido_por: string | null;
          created_at: string;
          criado_por: string | null;
          data_desmobilizacao: string;
          id: string;
          obra_id: string;
          observacao: string | null;
          status: Database["public"]["Enums"]["solicitacao_servico_status"];
          updated_at: string;
        };
        Insert: {
          cliente_id: string;
          concluido_at?: string | null;
          concluido_por?: string | null;
          created_at?: string;
          criado_por?: string | null;
          data_desmobilizacao: string;
          id?: string;
          obra_id: string;
          observacao?: string | null;
          status?: Database["public"]["Enums"]["solicitacao_servico_status"];
          updated_at?: string;
        };
        Update: {
          cliente_id?: string;
          concluido_at?: string | null;
          concluido_por?: string | null;
          created_at?: string;
          criado_por?: string | null;
          data_desmobilizacao?: string;
          id?: string;
          obra_id?: string;
          observacao?: string | null;
          status?: Database["public"]["Enums"]["solicitacao_servico_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solicitacoes_desmobilizacao_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_desmobilizacao_concluido_por_fkey";
            columns: ["concluido_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_desmobilizacao_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_desmobilizacao_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
      unidades: {
        Row: {
          ativo: boolean;
          codigo: string | null;
          created_at: string;
          id: string;
          nome: string;
        };
        Insert: {
          ativo?: boolean;
          codigo?: string | null;
          created_at?: string;
          id?: string;
          nome: string;
        };
        Update: {
          ativo?: boolean;
          codigo?: string | null;
          created_at?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      user_permissions: {
        Row: {
          allowed: boolean;
          created_at: string;
          id: string;
          permission_key: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allowed?: boolean;
          created_at?: string;
          id?: string;
          permission_key: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allowed?: boolean;
          created_at?: string;
          id?: string;
          permission_key?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_colaborador_saldo: {
        Row: {
          cliente_id: string | null;
          colaborador_id: string | null;
          nome: string | null;
          saldo_confirmado: number | null;
          saldo_pendente: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "colaboradores_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      v_contrato_mo_saldo: {
        Row: {
          cliente_id: string | null;
          colaborador_id: string | null;
          colaborador_nome: string | null;
          contrato_id: string | null;
          created_at: string | null;
          descricao: string | null;
          obra_id: string | null;
          obra_nome: string | null;
          saldo_restante: number | null;
          status: Database["public"]["Enums"]["contrato_mo_status"] | null;
          valor_confirmado: number | null;
          valor_pendente: number | null;
          valor_total: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "contratos_mo_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contratos_mo_colaborador_id_fkey";
            columns: ["colaborador_id"];
            isOneToOne: false;
            referencedRelation: "colaboradores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contratos_mo_colaborador_id_fkey";
            columns: ["colaborador_id"];
            isOneToOne: false;
            referencedRelation: "v_colaborador_saldo";
            referencedColumns: ["colaborador_id"];
          },
          {
            foreignKeyName: "contratos_mo_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
      v_estoque_saldo: {
        Row: {
          cliente_id: string | null;
          estoque_item_id: string | null;
          item_id: string | null;
          item_nome: string | null;
          quantidade_atual: number | null;
          quantidade_minima: number | null;
          unidade_nome: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "estoque_itens_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estoque_itens_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      v_obra_orcamento_realizado: {
        Row: {
          categoria: string | null;
          cliente_id: string | null;
          descricao: string | null;
          material_realizado: number | null;
          mo_realizado: number | null;
          obra_id: string | null;
          orcamento_item_id: string | null;
          servicos_realizado: number | null;
          tipo: Database["public"]["Enums"]["obra_orcamento_tipo"] | null;
          valor_orcado: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "obra_orcamento_itens_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obra_orcamento_itens_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      can_access_solicitacao: { Args: { sol_id: string }; Returns: boolean };
      current_profile_cliente_id: { Args: never; Returns: string };
      current_profile_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: { Args: never; Returns: boolean };
      same_cliente: { Args: { target_cliente_id: string }; Returns: boolean };
    };
    Enums: {
      aprovacao_status: "pendente" | "aprovada" | "rejeitada";
      cacamba_acao_pendente: "troca" | "devolucao";
      cacamba_evento_tipo:
        | "entrega"
        | "pedido_troca"
        | "troca_confirmada"
        | "pedido_devolucao"
        | "devolucao_confirmada";
      cacamba_status: "solicitada" | "ativa" | "encerrada";
      contrato_mo_status: "aberto" | "quitado";
      cotacao_status:
        "rascunho" | "enviada" | "respondida" | "vencida" | "cancelada";
      ferramenta_status: "deposito" | "emprestada";
      lancamento_mo_status: "pendente" | "confirmado";
      lancamento_mo_tipo: "solicitacao" | "vale" | "reembolso";
      movimentacao_estoque_tipo: "entrada" | "saida";
      movimentacao_ferramenta_tipo: "saida" | "entrada";
      obra_fase: "fase_1" | "fase_2" | "fase_3" | "concluida";
      obra_orcamento_tipo: "insumos" | "mao_de_obra" | "servicos";
      pedido_local_entrega: "obra" | "deposito" | "retirada";
      pedido_status:
        "rascunho" | "emitido" | "enviado" | "recebido" | "cancelado";
      prioridade_solicitacao: "baixa" | "normal" | "alta" | "urgente";
      requisicao_almox_status: "pendente" | "separado";
      solicitacao_servico_status: "pendente" | "concluida";
      solicitacao_status:
        | "rascunho"
        | "aberta"
        | "em_cotacao"
        | "aprovacao"
        | "aprovada"
        | "rejeitada"
        | "cancelada"
        | "aguardando_aprovacao"
        | "autorizada"
        | "pdf_gerado"
        | "pedido_enviado"
        | "finalizada"
        | "cotacao_recebida"
        | "validado"
        | "pedido_programado";
      user_role: "adm_geral" | "compras" | "gestor_obra" | "almox";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      aprovacao_status: ["pendente", "aprovada", "rejeitada"],
      cacamba_acao_pendente: ["troca", "devolucao"],
      cacamba_evento_tipo: [
        "entrega",
        "pedido_troca",
        "troca_confirmada",
        "pedido_devolucao",
        "devolucao_confirmada",
      ],
      cacamba_status: ["solicitada", "ativa", "encerrada"],
      contrato_mo_status: ["aberto", "quitado"],
      cotacao_status: [
        "rascunho",
        "enviada",
        "respondida",
        "vencida",
        "cancelada",
      ],
      ferramenta_status: ["deposito", "emprestada"],
      lancamento_mo_status: ["pendente", "confirmado"],
      lancamento_mo_tipo: ["solicitacao", "vale", "reembolso"],
      movimentacao_estoque_tipo: ["entrada", "saida"],
      movimentacao_ferramenta_tipo: ["saida", "entrada"],
      obra_fase: ["fase_1", "fase_2", "fase_3", "concluida"],
      obra_orcamento_tipo: ["insumos", "mao_de_obra", "servicos"],
      pedido_local_entrega: ["obra", "deposito", "retirada"],
      pedido_status: [
        "rascunho",
        "emitido",
        "enviado",
        "recebido",
        "cancelado",
      ],
      prioridade_solicitacao: ["baixa", "normal", "alta", "urgente"],
      requisicao_almox_status: ["pendente", "separado"],
      solicitacao_servico_status: ["pendente", "concluida"],
      solicitacao_status: [
        "rascunho",
        "aberta",
        "em_cotacao",
        "aprovacao",
        "aprovada",
        "rejeitada",
        "cancelada",
        "aguardando_aprovacao",
        "autorizada",
        "pdf_gerado",
        "pedido_enviado",
        "finalizada",
        "cotacao_recebida",
        "validado",
        "pedido_programado",
      ],
      user_role: ["adm_geral", "compras", "gestor_obra", "almox"],
    },
  },
} as const;

export type UserRole = Database["public"]["Enums"]["user_role"];
