import os
import psycopg2
from datetime import datetime, timedelta
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

# Monta URL de conexão
if POOLER_TENANT_ID:
    DATABASE_URL = f"postgres://{DB_NAME}.{POOLER_TENANT_ID}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
else:
    DATABASE_URL = f"postgres://{DB_NAME}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

def gerar_datas_ferias(data_inicio_str, dias=14):
    """Gera lista de datas consecutivas para férias"""
    data_inicio = datetime.strptime(data_inicio_str, "%Y-%m-%d")
    return [(data_inicio + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(dias)]

def seed_database():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("✅ Conectado ao banco de dados\n")
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return

    try:
        print("🏢 Inserindo Barbearias...\n")
        
        # ========== BARBEARIA 1: Classic Barber Shop ==========
        cur.execute("""
            INSERT INTO business (nome, cnpj, email, whatsapp, telefone, endereco, cidade, estado, cep, ativo, dominio)
            VALUES (
                'Classic Barber Shop',
                '12.345.678/0001-90',
                'contato@classicbarber.com',
                '85987654321',
                '8532221234',
                'Rua das Flores, 123',
                'Juazeiro do Norte',
                'CE',
                '63010-000',
                true,
                'classicbarber'
            )
            RETURNING id;
        """)
        business1_id = cur.fetchone()[0]
        print(f"   ✅ Classic Barber Shop criada (ID: {business1_id})")

        # ========== BARBEARIA 2: Style & Cut ==========
        cur.execute("""
            INSERT INTO business (nome, cnpj, email, whatsapp, telefone, endereco, cidade, estado, cep, ativo, dominio)
            VALUES (
                'Style & Cut',
                '98.765.432/0001-10',
                'contato@stylecut.com',
                '85988776655',
                '8533334455',
                'Av. Leão Sampaio, 456',
                'Juazeiro do Norte',
                'CE',
                '63020-000',
                true,
                'stylecut'
            )
            RETURNING id;
        """)
        business2_id = cur.fetchone()[0]
        print(f"   ✅ Style & Cut criada (ID: {business2_id})\n")

        # ========== TRABALHADORES ==========
        print("👨‍💼 Inserindo Trabalhadores...\n")
        
        # Trabalhadores da Classic Barber Shop
        cur.execute("""
            INSERT INTO trabalhadores (business_id, nome, email, telefone, ativo)
            VALUES 
                (%s, 'Carlos Silva', 'carlos@classicbarber.com', '85991234567', true),
                (%s, 'João Santos', 'joao@classicbarber.com', '85992345678', true)
            RETURNING id;
        """, (business1_id, business1_id))
        trabalhador1_ids = [row[0] for row in cur.fetchall()]
        print(f"   ✅ Carlos Silva (ID: {trabalhador1_ids[0]})")
        print(f"   ✅ João Santos (ID: {trabalhador1_ids[1]})")

        # Trabalhadores da Style & Cut
        cur.execute("""
            INSERT INTO trabalhadores (business_id, nome, email, telefone, ativo)
            VALUES 
                (%s, 'Pedro Oliveira', 'pedro@stylecut.com', '85993456789', true),
                (%s, 'Lucas Ferreira', 'lucas@stylecut.com', '85994567890', true)
            RETURNING id;
        """, (business2_id, business2_id))
        trabalhador2_ids = [row[0] for row in cur.fetchall()]
        print(f"   ✅ Pedro Oliveira (ID: {trabalhador2_ids[0]})")
        print(f"   ✅ Lucas Ferreira (ID: {trabalhador2_ids[1]})\n")

        # ========== SERVIÇOS ==========
        print("✂️ Inserindo Serviços...\n")
        
        # Serviços Classic Barber Shop
        cur.execute("""
            INSERT INTO servicos (business_id, nome, duracao_minutos, preco, descricao, ativo)
            VALUES 
                (%s, 'Corte Simples', 30, 35.00, 'Corte masculino tradicional', true),
                (%s, 'Barba', 20, 25.00, 'Aparar e modelar barba', true),
                (%s, 'Corte + Barba', 45, 55.00, 'Combo completo', true),
                (%s, 'Sobrancelha', 15, 15.00, 'Design de sobrancelha', true)
            RETURNING id;
        """, (business1_id, business1_id, business1_id, business1_id))
        servicos1_ids = [row[0] for row in cur.fetchall()]

        # Serviços Style & Cut
        cur.execute("""
            INSERT INTO servicos (business_id, nome, duracao_minutos, preco, descricao, ativo)
            VALUES 
                (%s, 'Corte Premium', 40, 45.00, 'Corte moderno com finalização', true),
                (%s, 'Barba Completa', 30, 30.00, 'Barba + Hidratação', true),
                (%s, 'Degradê', 35, 40.00, 'Corte degradê profissional', true),
                (%s, 'Pigmentação', 25, 50.00, 'Pigmentação de barba/cabelo', true)
            RETURNING id;
        """, (business2_id, business2_id, business2_id, business2_id))
        servicos2_ids = [row[0] for row in cur.fetchall()]
        print(f"   ✅ 4 serviços para Classic Barber Shop")
        print(f"   ✅ 4 serviços para Style & Cut\n")

        # ========== ASSOCIAR SERVIÇOS AOS TRABALHADORES ==========
        print("🔗 Associando serviços aos trabalhadores...\n")
        
        # Classic Barber Shop - Todos fazem tudo
        for trabalhador_id in trabalhador1_ids:
            for servico_id in servicos1_ids:
                cur.execute("""
                    INSERT INTO trabalhador_servico (business_id, trabalhador_id, servico_id)
                    VALUES (%s, %s, %s);
                """, (business1_id, trabalhador_id, servico_id))

        # Style & Cut - Todos fazem tudo
        for trabalhador_id in trabalhador2_ids:
            for servico_id in servicos2_ids:
                cur.execute("""
                    INSERT INTO trabalhador_servico (business_id, trabalhador_id, servico_id)
                    VALUES (%s, %s, %s);
                """, (business2_id, trabalhador_id, servico_id))
        
        print("   ✅ Todos os trabalhadores associados aos serviços\n")

        # ========== HORÁRIOS PADRÃO ==========
        print("⏰ Configurando horários padrão...\n")
        
        # Para todos os 4 trabalhadores
        todos_trabalhadores = trabalhador1_ids + trabalhador2_ids
        all_business_ids = [business1_id] * 2 + [business2_id] * 2
        
        # REGRA PADRÃO: Seg-Sáb 8h-20h, almoço 12:30-14h
        for trabalhador_id, business_id in zip(todos_trabalhadores, all_business_ids):
            # Segunda a Sábado (1 a 6)
            for dia in range(1, 7):
                cur.execute("""
                    INSERT INTO horarios_padrao (business_id, trabalhador_id, dia_semana, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim)
                    VALUES (%s, %s, %s, '08:00', '20:00', '12:30', '14:00');
                """, (business_id, trabalhador_id, dia))
        
        print("   ✅ Horário padrão: Segunda a Sábado, 8h-20h (almoço 12:30-14h)")
        print(f"   ✅ Aplicado para todos os 4 trabalhadores\n")
        
        # Define a data de hoje para uso nas exceções
        hoje = datetime.now()
        
        # ========== EXCEÇÃO: Lucas Ferreira trabalha Seg-Sex 8h-17h ==========
        print("⚙️  Configurando exceção de horário para Lucas Ferreira...\n")
        
        # Lucas trabalha apenas Seg-Sex das 8h às 17h
        # Precisamos bloquear: Sábados inteiros + após 17h nos dias úteis
        
        # 1. Bloquear todos os SÁBADOS (próximos 60 dias)
        for i in range(60):
            data = hoje + timedelta(days=i)
            if data.weekday() == 5:  # Sábado = 5
                data_str = data.strftime("%Y-%m-%d")
                cur.execute("""
                    INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, motivo)
                    VALUES (%s, %s, %s, 'folga', 'Folga aos sábados');
                """, (business2_id, trabalhador2_ids[1], data_str))
        
        # 2. Bloquear horário de 17h-20h nos dias úteis (Seg-Sex)
        for i in range(60):
            data = hoje + timedelta(days=i)
            if data.weekday() < 5:  # Segunda a Sexta (0-4)
                data_str = data.strftime("%Y-%m-%d")
                cur.execute("""
                    INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, hora_inicio, hora_fim, motivo)
                    VALUES (%s, %s, %s, 'bloqueio', '17:00', '20:00', 'Horário reduzido');
                """, (business2_id, trabalhador2_ids[1], data_str))
        
        print(f"   ✅ Lucas Ferreira: Segunda a Sexta, 8h-17h (almoço 12:30-14h)")
        print(f"   ✅ Sábados bloqueados para Lucas\n")

        # ========== EXCEÇÕES: DOMINGOS ==========
        print("🚫 Bloqueando TODOS os domingos (próximos 60 dias)...\n")
        
        hoje = datetime.now()
        for i in range(60):
            data = hoje + timedelta(days=i)
            if data.weekday() == 6:  # Domingo = 6
                data_str = data.strftime("%Y-%m-%d")
                for trabalhador_id, business_id in zip(todos_trabalhadores, all_business_ids):
                    cur.execute("""
                        INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, motivo)
                        VALUES (%s, %s, %s, 'folga', 'Domingo - Fechado');
                    """, (business_id, trabalhador_id, data_str))
        
        print("   ✅ Domingos bloqueados\n")

        # ========== FÉRIAS INDIVIDUAIS ==========
        print("🏖️ Configurando férias dos trabalhadores...\n")
        
        # Carlos Silva - Férias de 20/12/2025 a 02/01/2026 (14 dias)
        ferias_carlos = gerar_datas_ferias("2025-12-20", 14)
        for data in ferias_carlos:
            cur.execute("""
                INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, motivo)
                VALUES (%s, %s, %s, 'folga', 'Férias');
            """, (business1_id, trabalhador1_ids[0], data))
        print(f"   ✅ Carlos Silva: 20/12/2025 a 02/01/2026")

        # João Santos - Férias de 10/11/2025 a 23/11/2025 (14 dias)
        ferias_joao = gerar_datas_ferias("2025-11-10", 14)
        for data in ferias_joao:
            cur.execute("""
                INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, motivo)
                VALUES (%s, %s, %s, 'folga', 'Férias');
            """, (business1_id, trabalhador1_ids[1], data))
        print(f"   ✅ João Santos: 10/11/2025 a 23/11/2025")

        # Pedro Oliveira - Férias de 01/01/2026 a 14/01/2026 (14 dias)
        ferias_pedro = gerar_datas_ferias("2026-01-01", 14)
        for data in ferias_pedro:
            cur.execute("""
                INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, motivo)
                VALUES (%s, %s, %s, 'folga', 'Férias');
            """, (business2_id, trabalhador2_ids[0], data))
        print(f"   ✅ Pedro Oliveira: 01/01/2026 a 14/01/2026")

        # Lucas Ferreira - Férias de 15/02/2026 a 28/02/2026 (14 dias)
        ferias_lucas = gerar_datas_ferias("2026-02-15", 14)
        for data in ferias_lucas:
            cur.execute("""
                INSERT INTO horarios_excecoes (business_id, trabalhador_id, data, tipo, motivo)
                VALUES (%s, %s, %s, 'folga', 'Férias');
            """, (business2_id, trabalhador2_ids[1], data))
        print(f"   ✅ Lucas Ferreira: 15/02/2026 a 28/02/2026\n")

        # ========== ALGUNS AGENDAMENTOS DE EXEMPLO ==========
        print("📅 Criando alguns agendamentos de exemplo...\n")
        
        # Agendamentos para Classic Barber Shop - Carlos Silva
        cur.execute("""
            INSERT INTO agendamentos (business_id, trabalhador_id, servico_id, cliente_nome, cliente_telefone, data_agendamento, hora_inicio, hora_fim, status)
            VALUES 
                (%s, %s, %s, 'José da Silva', '85999887766', '2025-10-15', '09:00', '09:30', 'confirmado'),
                (%s, %s, %s, 'Maria Souza', '85988776655', '2025-10-15', '10:00', '10:45', 'confirmado'),
                (%s, %s, %s, 'Antonio Lima', '85977665544', '2025-10-16', '14:30', '15:15', 'confirmado');
        """, (
            business1_id, trabalhador1_ids[0], servicos1_ids[0],
            business1_id, trabalhador1_ids[0], servicos1_ids[2],
            business1_id, trabalhador1_ids[0], servicos1_ids[2]
        ))

        # Agendamentos para Style & Cut - Pedro Oliveira
        cur.execute("""
            INSERT INTO agendamentos (business_id, trabalhador_id, servico_id, cliente_nome, cliente_telefone, data_agendamento, hora_inicio, hora_fim, status)
            VALUES 
                (%s, %s, %s, 'Paulo Santos', '85966554433', '2025-10-15', '08:30', '09:10', 'confirmado'),
                (%s, %s, %s, 'Ricardo Alves', '85955443322', '2025-10-16', '16:00', '16:30', 'confirmado');
        """, (
            business2_id, trabalhador2_ids[0], servicos2_ids[0],
            business2_id, trabalhador2_ids[0], servicos2_ids[1]
        ))

        print("   ✅ 5 agendamentos criados\n")

        # Commit final
        conn.commit()
        
        print("=" * 60)
        print("✅ SEED COMPLETO!")
        print("=" * 60)
        print("\n📊 RESUMO:")
        print(f"   🏢 2 Barbearias criadas")
        print(f"   👨‍💼 4 Trabalhadores (2 por barbearia)")
        print(f"   ✂️  8 Serviços (4 por barbearia)")
        print(f"\n⏰ HORÁRIOS PADRÃO:")
        print(f"   • Segunda a Sábado: 8h-20h")
        print(f"   • Almoço: 12:30-14h (todos)")
        print(f"\n🔧 EXCEÇÃO:")
        print(f"   • Lucas Ferreira: Segunda a Sexta, 8h-17h")
        print(f"   • (Almoço mantido: 12:30-14h)")
        print(f"\n🚫 BLOQUEIOS:")
        print(f"   • Domingos: Todos (fechado)")
        print(f"   • Sábados: Apenas Lucas (folga)")
        print(f"\n🏖️ FÉRIAS:")
        print(f"   • Carlos Silva: 20/12/2025 a 02/01/2026")
        print(f"   • João Santos: 10/11/2025 a 23/11/2025")
        print(f"   • Pedro Oliveira: 01/01/2026 a 14/01/2026")
        print(f"   • Lucas Ferreira: 15/02/2026 a 28/02/2026")
        print(f"\n📅 5 agendamentos de exemplo")
        print("\n💡 Barbearias:")
        print(f"   • Classic Barber Shop (ID: {business1_id})")
        print(f"   • Style & Cut (ID: {business2_id})")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Erro ao inserir dados: {e}")
    
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_database()