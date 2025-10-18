import os
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

# Configuração do banco
DB_NAME = os.getenv("POSTGRES_DB")
POOLER_TENANT_ID = os.getenv("POOLER_TENANT_ID")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_HOST = "localhost"
POSTGRES_DB = os.getenv("POSTGRES_DB")

# Se tiver POOLER_TENANT_ID, usa o formato com tenant, senão usa formato simples
if POOLER_TENANT_ID:
    DATABASE_URL = f"postgres://{DB_NAME}.{POOLER_TENANT_ID}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
else:
    DATABASE_URL = f"postgres://{DB_NAME}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Schemas e dados das tabelas (ATUALIZADOS)
table_schemes = {
    "trabalhadores": {
        "schema": """
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.horarios_disponiveis CASCADE;
DROP TABLE IF EXISTS public.trabalhador_servico CASCADE;
DROP TABLE IF EXISTS public.horarios_trabalho CASCADE;
DROP TABLE IF EXISTS public.servicos CASCADE;
DROP TABLE IF EXISTS public.trabalhadores CASCADE;

CREATE TABLE public.trabalhadores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
        """,
        "data": [
            (1, 'Maria Silva', 'maria@email.com', '(88) 98888-1111', True, '2025-01-01 10:00:00'),
            (2, 'João Santos', 'joao@email.com', '(88) 98888-2222', True, '2025-01-01 10:00:00'),
        ]
    },
    
    "servicos": {
        "schema": """
CREATE TABLE public.servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
        """,
        "data": [
            (1, 'Barba', 30, 25.00, 'Corte e acabamento de barba', True, '2025-01-01 10:00:00'),
            (2, 'Corte Masculino', 45, 35.00, 'Corte de cabelo masculino', True, '2025-01-01 10:00:00'),
            (3, 'Barba + Corte', 60, 55.00, 'Pacote completo', True, '2025-01-01 10:00:00'),
        ]
    },
    
    "trabalhador_servico": {
        "schema": """
CREATE TABLE public.trabalhador_servico (
  id SERIAL PRIMARY KEY,
  trabalhador_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
  UNIQUE(trabalhador_id, servico_id)
);
        """,
        "data": [
            (1, 1, 1),  # Maria faz Barba
            (2, 1, 2),  # Maria faz Corte
            (3, 1, 3),  # Maria faz Barba + Corte
            (4, 2, 1),  # João faz Barba
            (5, 2, 3),  # João faz Barba + Corte
        ]
    },
    
    "horarios_disponiveis": {
        "schema": """
CREATE TABLE public.horarios_disponiveis (
  id SERIAL PRIMARY KEY,
  trabalhador_id INTEGER NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  intervalo_inicio TIME NULL,
  intervalo_fim TIME NULL,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE
);

COMMENT ON COLUMN horarios_disponiveis.intervalo_inicio IS 'Início do horário de almoço/intervalo';
COMMENT ON COLUMN horarios_disponiveis.intervalo_fim IS 'Fim do horário de almoço/intervalo';

CREATE INDEX idx_horarios_disponiveis_data ON horarios_disponiveis(data, trabalhador_id);
        """,
        "data": [
            # Maria - 10 de outubro de 2025 (8h às 20h, almoço 12h-13h)
            (1, 1, '2025-10-10', '08:00:00', '20:00:00', '12:00:00', '13:00:00'),
            # Maria - 11 de outubro de 2025
            (2, 1, '2025-10-11', '08:00:00', '20:00:00', '12:00:00', '13:00:00'),
            # João - 10 de outubro de 2025 (9h às 18h, almoço 12h-13h)
            (3, 2, '2025-10-10', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
            # João - 11 de outubro de 2025
            (4, 2, '2025-10-11', '09:00:00', '18:00:00', '12:00:00', '13:00:00'),
        ]
    },
    
    "agendamentos": {
        "schema": """
CREATE TABLE public.agendamentos (
  id SERIAL PRIMARY KEY,
  trabalhador_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  cliente_nome VARCHAR(100) NOT NULL,
  cliente_telefone VARCHAR(20) NOT NULL,
  data_agendamento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'cancelado', 'concluido')),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
);

CREATE INDEX idx_agendamentos_data ON agendamentos(data_agendamento, trabalhador_id);
        """,
        "data": [
            # Apenas 2 agendamentos para facilitar visualização
            (1, 1, 1, 'Carlos Oliveira', '(88) 99999-1111', '2025-10-10', '10:00:00', '10:30:00', 'confirmado', None, '2025-10-09 15:30:00'),
            (2, 2, 1, 'Pedro Alves', '(88) 99999-2222', '2025-10-10', '14:00:00', '14:30:00', 'confirmado', None, '2025-10-09 16:00:00'),
        ]
    }
}

# Mapeamento de colunas para cada tabela
table_columns = {
    "trabalhadores": ["id", "nome", "email", "telefone", "ativo", "created_at"],
    "servicos": ["id", "nome", "duracao_minutos", "preco", "descricao", "ativo", "created_at"],
    "trabalhador_servico": ["id", "trabalhador_id", "servico_id"],
    "horarios_disponiveis": ["id", "trabalhador_id", "data", "hora_inicio", "hora_fim", "intervalo_inicio", "intervalo_fim"],
    "agendamentos": ["id", "trabalhador_id", "servico_id", "cliente_nome", "cliente_telefone", 
                     "data_agendamento", "hora_inicio", "hora_fim", "status", "observacoes", "created_at"]
}

def main():
    print("🚀 Iniciando setup do sistema de agendamento (por data específica)...\n")
    
    # Conecta ao PostgreSQL
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Conectado ao banco de dados\n")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        return

    # Processa cada tabela
    for table_name, table_info in table_schemes.items():
        print(f"📋 Processando tabela: {table_name}")
        
        try:
            # 1️⃣ Criar a tabela
            print(f"   Criando schema...")
            cur.execute(table_info["schema"])
            conn.commit()
            print(f"   ✅ Schema criado")
            
            # 2️⃣ Inserir dados
            if table_info["data"]:
                print(f"   Inserindo {len(table_info['data'])} registros...")
                
                columns = table_columns[table_name]
                columns_sql = ", ".join([f'"{col}"' for col in columns])
                placeholders = ", ".join(["%s"] * len(columns))
                
                insert_sql = f"""
                INSERT INTO public.{table_name} ({columns_sql})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING;
                """
                
                cur.executemany(insert_sql, table_info["data"])
                conn.commit()
                print(f"   ✅ {len(table_info['data'])} registros inseridos\n")
            
        except Exception as e:
            conn.rollback()
            print(f"   ⚠️  Erro: {e}\n")
    
    # Fecha conexão
    cur.close()
    conn.close()
    print("✅ Setup concluído! Sistema configurado para agendamentos por data específica.")
    print("\n📅 Dados de teste criados:")
    print("   - 2 trabalhadores (Maria e João)")
    print("   - 3 serviços (Barba, Corte, Barba+Corte)")
    print("   - Horários disponíveis para 10 e 11 de outubro de 2025")
    print("   - Horário de trabalho: 8h-20h (Maria) / 9h-18h (João)")
    print("   - Intervalo de almoço: 12h-13h")
    print("   - 2 agendamentos já marcados para visualizar horários ocupados")

if __name__ == "__main__":
    main()