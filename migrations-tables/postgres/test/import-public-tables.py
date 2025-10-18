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
POSTGRES_HOST = "localhost" #os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_DB = os.getenv("POSTGRES_DB")
DATABASE_URL = f"postgres://{DB_NAME}.{POOLER_TENANT_ID}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"


# Schemas e dados das tabelas
table_schemes = {
    "trabalhadores": {
        "schema": """
CREATE TABLE IF NOT EXISTS public.trabalhadores (
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
            (3, 'Ana Costa', 'ana@email.com', '(88) 98888-3333', True, '2025-01-01 10:00:00')
        ]
    },
    
    "servicos": {
        "schema": """
CREATE TABLE IF NOT EXISTS public.servicos (
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
            (4, 'Sobrancelha', 15, 15.00, 'Design de sobrancelha', True, '2025-01-01 10:00:00')
        ]
    },
    
    "trabalhador_servico": {
        "schema": """
CREATE TABLE IF NOT EXISTS public.trabalhador_servico (
  id SERIAL PRIMARY KEY,
  trabalhador_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id),
  FOREIGN KEY (servico_id) REFERENCES servicos(id),
  UNIQUE(trabalhador_id, servico_id)
);
        """,
        "data": [
            (1, 1, 1),
            (2, 1, 2),
            (3, 1, 3),
            (4, 2, 1),
            (5, 2, 3),
            (6, 3, 1),
            (7, 3, 2),
            (8, 3, 4)
        ]
    },
    
    "horarios_trabalho": {
        "schema": """
CREATE TABLE IF NOT EXISTS public.horarios_trabalho (
  id SERIAL PRIMARY KEY,
  trabalhador_id INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id)
);

COMMENT ON COLUMN horarios_trabalho.dia_semana IS '0=Domingo, 1=Segunda, ..., 6=Sábado';
        """,
        "data": [
            (1, 1, 1, '09:00:00', '18:00:00'),
            (2, 1, 2, '09:00:00', '18:00:00'),
            (3, 1, 3, '09:00:00', '18:00:00'),
            (4, 1, 4, '09:00:00', '18:00:00'),
            (5, 1, 5, '09:00:00', '18:00:00'),
            (6, 2, 1, '10:00:00', '19:00:00'),
            (7, 2, 2, '10:00:00', '19:00:00'),
            (8, 2, 3, '10:00:00', '19:00:00'),
            (9, 2, 4, '10:00:00', '19:00:00'),
            (10, 2, 5, '10:00:00', '19:00:00'),
            (11, 3, 2, '08:00:00', '17:00:00'),
            (12, 3, 3, '08:00:00', '17:00:00'),
            (13, 3, 4, '08:00:00', '17:00:00'),
            (14, 3, 5, '08:00:00', '17:00:00'),
            (15, 3, 6, '08:00:00', '14:00:00')
        ]
    },
    
    "agendamentos": {
        "schema": """
CREATE TABLE IF NOT EXISTS public.agendamentos (
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
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id),
  FOREIGN KEY (servico_id) REFERENCES servicos(id)
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_agendamento, trabalhador_id);
        """,
        "data": [
            (1, 1, 1, 'Carlos Oliveira', '(88) 99999-1111', '2025-10-09', '10:00:00', '10:30:00', 'confirmado', None, '2025-10-08 15:30:00'),
            (2, 1, 1, 'Pedro Alves', '(88) 99999-2222', '2025-10-09', '11:00:00', '11:30:00', 'confirmado', None, '2025-10-08 16:00:00'),
            (3, 1, 2, 'Lucas Mendes', '(88) 99999-3333', '2025-10-09', '14:00:00', '14:45:00', 'confirmado', None, '2025-10-08 17:00:00'),
            (4, 2, 1, 'Rafael Costa', '(88) 99999-4444', '2025-10-09', '12:00:00', '12:30:00', 'confirmado', 'Cliente prefere barba mais curta', '2025-10-08 18:00:00'),
            (5, 2, 3, 'Thiago Lima', '(88) 99999-5555', '2025-10-09', '13:00:00', '14:00:00', 'confirmado', None, '2025-10-08 19:00:00'),
            (6, 3, 2, 'Gabriel Santos', '(88) 99999-6666', '2025-10-09', '15:00:00', '15:45:00', 'confirmado', None, '2025-10-09 08:00:00')
        ]
    }
}

# Mapeamento de colunas para cada tabela
table_columns = {
    "trabalhadores": ["id", "nome", "email", "telefone", "ativo", "created_at"],
    "servicos": ["id", "nome", "duracao_minutos", "preco", "descricao", "ativo", "created_at"],
    "trabalhador_servico": ["id", "trabalhador_id", "servico_id"],
    "horarios_trabalho": ["id", "trabalhador_id", "dia_semana", "hora_inicio", "hora_fim"],
    "agendamentos": ["id", "trabalhador_id", "servico_id", "cliente_nome", "cliente_telefone", 
                     "data_agendamento", "hora_inicio", "hora_fim", "status", "observacoes", "created_at"]
}

def main():
    print("🚀 Iniciando setup do sistema de agendamento...\n")
    
    # Conecta ao PostgreSQL
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Conectado ao banco de dados\n")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        print(f"DATABASE_URL:{DATABASE_URL}")
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
    print("✅ Setup concluído! Todas as tabelas foram criadas e populadas.")

if __name__ == "__main__":
    main()