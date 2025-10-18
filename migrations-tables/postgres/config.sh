#!/bin/bash

# Nome do venv
VENV_DIR="venv"

rm -r ./venv

# Verifica se python3 está instalado
if ! command -v python3 &> /dev/null
then
    echo "python3 não encontrado. Instale o python3 antes de continuar."
    exit 1
fi

# Cria o venv se não existir
# if [ ! -d "$VENV_DIR" ]; then
#     echo "Criando ambiente virtual em $VENV_DIR..."
#     python3 -m venv "$VENV_DIR"
# else
#     echo "Ambiente virtual $VENV_DIR já existe."
# fi
echo "Criando ambiente virtual em $VENV_DIR..."
python3 -m venv "$VENV_DIR"

# Ativa o venv
echo "Ativando o ambiente virtual..."
source "$VENV_DIR/bin/activate"

# Atualiza pip
echo "Atualizando pip..."
pip install --upgrade pip

# Instala dependências
echo "Instalando dependências..."
pip install  psycopg2-binary python-dotenv supabase
source $VENV_DIR/bin/activate

echo "Setup concluído! Ambiente virtual '$VENV_DIR' pronto."
echo "Para ativar manualmente: source $VENV_DIR/bin/activate"

