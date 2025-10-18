import os
import psycopg2
import random
import calendar
from datetime import date, time, datetime, timedelta
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

DB_NAME = os.getenv("POSTGRES_DB")
POOLER_TENANT_ID = os.getenv("POOLER_TENANT_ID")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_HOST = "localhost"
POSTGRES_DB = os.getenv("POSTGRES_DB")

if POOLER_TENANT_ID:
    DATABASE_URL = f"postgres://{DB_NAME}.{POOLER_TENANT_ID}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
else:
    DATABASE_URL = f"postgres://{DB_NAME}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# -------------------------------------------------------------------
def criar_dados():
    """Cria dados fake e insere nas tabelas"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Conectado ao banco de dados")

        # ------------------------------
        # 1️⃣ Empresas
        # ------------------------------
        empresas = [
            ("Barbearia Estilo", "12.345.678/0001-11", "estilo@barbearia.com", "https://estilo.com/logo.png"),
            ("Corte Fino", "98.765.432/0001-22", "contato@cortefino.com", "https://cortefino.com/logo.png"),
        ]

        business_ids = []
        for nome, cnpj, email, logo in empresas:
            cur.execute("""
                INSERT INTO business (nome, cnpj, email, logo_url, cidade, estado, cep, endereco)
                VALUES (%s, %s, %s, %s, 'Fortaleza', 'CE', '60000-000', 'Rua Principal, 123')
                RETURNING id;
            """, (nome, cnpj, email, logo))
            business_ids.append(cur.fetchone()[0])
        print("🏢 Barbearias inseridas")

        # ------------------------------
        # 2️⃣ Trabalhadores
        # ------------------------------
        trabalhadores_data = {
            business_ids[0]: [
                ("Carlos Silva", "carlos@estilo.com", "85988887777"),
                ("João Pereira", "joao@estilo.com", "85999996666")
            ],
            business_ids[1]: [
                ("Marcos Lima", "marcos@cortefino.com", "85991112222"),
                ("Pedro Rocha", "pedro@cortefino.com", "85992223333")
            ]
        }

        trabalhador_ids = []
        for business_id, trabalhadores in trabalhadores_data.items():
            for nome, email, telefone in trabalhadores:
                cur.execute("""
                    INSERT INTO trabalhadores (business_id, nome, email, telefone)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id;
                """, (business_id, nome, email, telefone))
                trabalhador_ids.append((business_id, cur.fetchone()[0]))
        print("💈 Trabalhadores inseridos")

        # ------------------------------
        # 3️⃣ Serviços
        # ------------------------------
        servicos_base = [
            ("Corte de Cabelo", 30, 40.00, "Corte masculino clássico ou moderno."),
            ("Barba", 20, 25.00, "Aparar e modelar barba."),
            ("Corte + Barba", 50, 60.00, "Pacote completo de corte e barba.")
        ]

        servico_ids = []
        for business_id in business_ids:
            for nome, duracao, preco, desc in servicos_base:
                cur.execute("""
                    INSERT INTO servicos (business_id, nome, duracao_minutos, preco, descricao)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id;
                """, (business_id, nome, duracao, preco, desc))
                servico_ids.append((business_id, cur.fetchone()[0]))
        print("✂️ Serviços inseridos")

        # ------------------------------
        # 4️⃣ Relacionamento trabalhador_servico
        # ------------------------------
        for business_id, trabalhador_id in trabalhador_ids:
            for bid, servico_id in servico_ids:
                if bid == business_id:
                    cur.execute("""
                        INSERT INTO trabalhador_servico (business_id, trabalhador_id, servico_id)
                        VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING;
                    """, (business_id, trabalhador_id, servico_id))
        print("🔗 Relacionamento trabalhador-serviço criado")

        # ------------------------------
        # 5️⃣ Horários disponíveis (mês atual)
        # ------------------------------
        hoje = date.today()
        year, month = hoje.year, hoje.month
        _, num_days = calendar.monthrange(year, month)

        for business_id, trabalhador_id in trabalhador_ids:
            for day in range(1, num_days + 1):
                dia = date(year, month, day)
                # Segunda a sábado
                if dia.weekday() < 6:
                    cur.execute("""
                        INSERT INTO horarios_disponiveis
                        (business_id, trabalhador_id, data, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim)
                        VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """, (business_id, trabalhador_id, dia, time(9,0), time(17,0), time(12,0), time(13,0)))
        print("🕒 Horários disponíveis gerados para o mês inteiro")

        # ------------------------------
        # 6️⃣ Agendamentos
        # ------------------------------
        agendamentos = [
            ("Lucas Almeida", "85988885555", 0, 0, 0, "2025-10-15", "09:00", "09:30"),
            ("Matheus Costa", "85999994444", 0, 1, 1, "2025-10-16", "14:00", "14:30"),
            ("Joana Lima", "85992221111", 1, 2, 2, "2025-10-20", "10:00", "10:50")
        ]

        for nome, telefone, biz_idx, trab_idx, serv_idx, data_ag, hora_i, hora_f in agendamentos:
            business_id = business_ids[biz_idx]
            trabalhador_id = trabalhador_ids[trab_idx][1]
            servico_id = servico_ids[serv_idx][1]
            cur.execute("""
                INSERT INTO agendamentos (business_id, trabalhador_id, servico_id, cliente_nome, cliente_telefone, data_agendamento, hora_inicio, hora_fim, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'confirmado');
            """, (business_id, trabalhador_id, servico_id, nome, telefone, data_ag, hora_i, hora_f))
        print("📅 Agendamentos criados")

        # Finaliza
        conn.commit()
        cur.close()
        conn.close()
        print("\n✅ Inserção concluída com sucesso!")

    except Exception as e:
        print(f"❌ Erro ao inserir dados: {e}")

# -------------------------------------------------------------------
if __name__ == "__main__":
    criar_dados()
