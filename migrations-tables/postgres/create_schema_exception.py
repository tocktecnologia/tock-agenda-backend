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

# Monta URL de conexão com ou sem POOLER_TENANT_ID
if POOLER_TENANT_ID:
    DATABASE_URL = f"postgres://{DB_NAME}.{POOLER_TENANT_ID}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
else:
    DATABASE_URL = f"postgres://{DB_NAME}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Schemas das tabelas (SOMENTE ESTRUTURA)
table_schemes = {
    "business": """
-- Garante que a extensão pgcrypto está ativa para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop de tabelas dependentes na ordem correta
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.horarios_excecoes CASCADE;
DROP TABLE IF EXISTS public.horarios_padrao CASCADE;
DROP TABLE IF EXISTS public.trabalhador_servico CASCADE;
DROP TABLE IF EXISTS public.servicos CASCADE;
DROP TABLE IF EXISTS public.trabalhadores CASCADE;
DROP TABLE IF EXISTS public.business CASCADE;

-- Criação da tabela principal
CREATE TABLE public.business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(100),
  whatsapp TEXT,
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(9),
  logo_url TEXT,
  ativo BOOLEAN DEFAULT true, 
  link_endereco TEXT,
  dominio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE business IS 'Tabela principal que representa a empresa/estabelecimento';
    """,
    
    "trabalhadores": """
CREATE TABLE public.trabalhadores (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  telefone VARCHAR(20) NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
);

CREATE INDEX idx_trabalhadores_business ON trabalhadores(business_id);
    """,
    
    "servicos": """
CREATE TABLE public.servicos (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  nome VARCHAR(100) NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
);

CREATE INDEX idx_servicos_business ON servicos(business_id);
    """,
    
    "trabalhador_servico": """
CREATE TABLE public.trabalhador_servico (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  trabalhador_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
  UNIQUE(trabalhador_id, servico_id)
);

CREATE INDEX idx_trabalhador_servico_business ON trabalhador_servico(business_id);
    """,
    
    "horarios_padrao": """
CREATE TABLE public.horarios_padrao (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  trabalhador_id INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  intervalo_inicio TIME NULL,
  intervalo_fim TIME NULL,
  ativo BOOLEAN DEFAULT true,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE,
  UNIQUE(trabalhador_id, dia_semana)
);

COMMENT ON TABLE horarios_padrao IS 'Define o horário padrão semanal de cada trabalhador';
COMMENT ON COLUMN horarios_padrao.dia_semana IS '0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado';
COMMENT ON COLUMN horarios_padrao.intervalo_inicio IS 'Início do horário de almoço/intervalo';
COMMENT ON COLUMN horarios_padrao.intervalo_fim IS 'Fim do horário de almoço/intervalo';

CREATE INDEX idx_horarios_padrao_trabalhador ON horarios_padrao(trabalhador_id);
CREATE INDEX idx_horarios_padrao_business ON horarios_padrao(business_id);

COMMENT ON TABLE horarios_padrao IS 'Horário base semanal do trabalhador. Para calcular disponibilidade em uma data específica:
1. Identifique o dia da semana da data
2. Busque o horário padrão para aquele dia_semana
3. Verifique se há exceções na tabela horarios_excecoes para aquela data
4. Subtraia os agendamentos já existentes';
    """,
    
    "horarios_excecoes": """
CREATE TABLE public.horarios_excecoes (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  trabalhador_id INTEGER NOT NULL,
  data DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('folga', 'bloqueio', 'personalizado')),
  hora_inicio TIME NULL,
  hora_fim TIME NULL,
  motivo TEXT,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE
);

COMMENT ON TABLE horarios_excecoes IS 'Exceções ao horário padrão: folgas, bloqueios ou horários personalizados';
COMMENT ON COLUMN horarios_excecoes.tipo IS 'folga=dia todo indisponível, bloqueio=período específico, personalizado=horário diferente do padrão';
COMMENT ON COLUMN horarios_excecoes.hora_inicio IS 'NULL = dia inteiro bloqueado (para tipo folga)';

CREATE INDEX idx_horarios_excecoes_data ON horarios_excecoes(data, trabalhador_id);
CREATE INDEX idx_horarios_excecoes_business ON horarios_excecoes(business_id);

COMMENT ON TABLE horarios_excecoes IS 'Exceções ao horário padrão.
- tipo=folga + hora_inicio/fim NULL: dia inteiro bloqueado
- tipo=bloqueio + hora_inicio/fim preenchidos: bloqueia período específico
- tipo=personalizado: horário diferente do padrão para aquela data';
    """,
    
    "agendamentos": """
CREATE TABLE public.agendamentos (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  trabalhador_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  cliente_nome VARCHAR(100) NOT NULL,
  cliente_telefone VARCHAR(20) NOT NULL,
  data_agendamento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'agendado' CHECK (status IN ('confirmado', 'cancelado', 'finalizado','agendado')),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
);

CREATE INDEX idx_agendamentos_data ON agendamentos(data_agendamento, trabalhador_id);
CREATE INDEX idx_agendamentos_business ON agendamentos(business_id);
    """,

    "notifications": """
CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
);

COMMENT ON TABLE notifications IS 'Notificações da empresa/negócio';
COMMENT ON COLUMN notifications.title IS 'Título da notificação';
COMMENT ON COLUMN notifications.message IS 'Mensagem/conteúdo da notificação';

CREATE INDEX idx_notifications_business ON notifications(business_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_business_created_at ON notifications(business_id, created_at DESC);
    """
}

def main():
    print("🚀 Criando estrutura do banco de dados...\n")
    
    # Conecta ao PostgreSQL
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Conectado ao banco de dados\n")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        return

    # Processa cada tabela
    for table_name, schema_sql in table_schemes.items():
        print(f"📋 Criando tabela: {table_name}")
        
        try:
            cur.execute(schema_sql)
            conn.commit()
            print(f"   ✅ Tabela {table_name} criada com sucesso\n")
            
        except Exception as e:
            conn.rollback()
            print(f"   ⚠️  Erro ao criar tabela {table_name}: {e}\n")
    
    # Fecha conexão
    cur.close()
    conn.close()
    print("✅ Estrutura do banco de dados criada com sucesso!")
    print("\n📊 Tabelas criadas:")
    print("   1. business (empresa)")
    print("   2. trabalhadores")
    print("   3. servicos")
    print("   4. trabalhador_servico")
    print("   5. horarios_padrao")
    print("   6. horarios_excecoes")
    print("   7. agendamentos")
    print("   8. notifications (novo!)")
    print("\n💡 Próximo passo: python seed_data.py")

if __name__ == "__main__":
    main()