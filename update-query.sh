#!/bin/bash

# Configurações
LOGFLARE_HOST="http://5.161.187.243:4000"
ENDPOINT_UUID="6e722371-a70b-4093-a42e-b22d2100985a"


# Carregue seu token privado do .env ou defina aqui
if [ -f .env ]; then
    export $(grep LOGFLARE_PRIVATE_ACCESS_TOKEN .env | xargs)
fi

echo "🔍 Verificando endpoint atual..."

# Primeiro, vamos ver o endpoint atual
curl -s -X GET \
  "${LOGFLARE_HOST}/api/endpoints/${ENDPOINT_UUID}" \
  -H "Authorization: Bearer ${LOGFLARE_PRIVATE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n\n✏️  Atualizando query do endpoint logs.all..."

# QUERY='WITH edge_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `cloudflare`.`logs`.`prod` AS t CROSS JOIN UNNEST(metadata) AS m WHERE t.project = @project AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), postgres_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `postgres`.`logs` AS t WHERE t.project = @project AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), function_edge_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `deno-relay-logs` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END AND m.project_ref = @project ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), function_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `deno-subhosting-events` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE m.project_ref = @project AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), auth_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `gotrue`.`logs`.`prod` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE t.project = @project AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), realtime_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `realtime`.`logs`.`prod` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE m.project = @project AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), storage_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `storage`.`logs`.`prod`.`2` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE m.project = @project AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), postgrest_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `postgREST`.`logs`.`prod` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END AND t.project = @project ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC), pgbouncer_logs AS (SELECT t.timestamp, t.id, t.event_message, t.metadata FROM `pgbouncer`.`logs`.`prod` AS t CROSS JOIN UNNEST(t.metadata) AS m WHERE CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END AND t.project = @project ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC) SELECT id, timestamp, event_message, metadata FROM edge_logs LIMIT 100'

QUERY='WITH edge_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `cloudflare`.`logs`.`prod` AS t 
  CROSS JOIN UNNEST(metadata) AS m 
  WHERE t.project = @project 
    AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
postgres_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `postgres`.`logs` AS t 
  WHERE t.project = @project 
    AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
function_edge_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `deno-relay-logs` AS t 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
function_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `deno-subhosting-events` AS t 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
auth_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `gotrue`.`logs`.`prod` AS t 
  CROSS JOIN UNNEST(t.metadata) AS m 
  WHERE t.project = @project 
    AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
realtime_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `realtime`.`logs`.`prod` AS t 
  CROSS JOIN UNNEST(t.metadata) AS m 
  WHERE m.project = @project 
    AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
storage_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `storage`.`logs`.`prod`.`2` AS t 
  CROSS JOIN UNNEST(t.metadata) AS m 
  WHERE m.project = @project 
    AND CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
postgrest_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `postgREST`.`logs`.`prod` AS t 
  CROSS JOIN UNNEST(t.metadata) AS m 
  WHERE CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
    AND t.project = @project 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
), 
pgbouncer_logs AS (
  SELECT t.timestamp, t.id, t.event_message, t.metadata 
  FROM `pgbouncer`.`logs`.`prod` AS t 
  CROSS JOIN UNNEST(t.metadata) AS m 
  WHERE CASE WHEN COALESCE(@iso_timestamp_start, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) > CAST(@iso_timestamp_start AS TIMESTAMP) END 
    AND CASE WHEN COALESCE(@iso_timestamp_end, '"'"''"'"') = '"'"''"'"' THEN true ELSE CAST(t.timestamp AS TIMESTAMP) <= CAST(@iso_timestamp_end AS TIMESTAMP) END 
    AND t.project = @project 
  ORDER BY CAST(t.timestamp AS TIMESTAMP) DESC
) 
SELECT id, timestamp, event_message, metadata 
FROM edge_logs 
LIMIT 100'

# Cria o JSON payload
JSON_PAYLOAD=$(jq -n \
  --arg name "logs.all" \
  --arg query "$QUERY" \
  '{name: $name, query: $query}')

echo "📦 Payload sendo enviado:"
echo "$JSON_PAYLOAD" | jq '.'

echo -e "\n🚀 Enviando requisição..."

# Faz a requisição e mostra o código de status
HTTP_RESPONSE=$(curl -w "\n%{http_code}" -X PUT \
  "${LOGFLARE_HOST}/api/endpoints/${ENDPOINT_UUID}" \
  -H "Authorization: Bearer ${LOGFLARE_PRIVATE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n 1)

echo "📊 Status Code: $HTTP_CODE"
echo "📄 Response Body:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\n✅ Query atualizada com sucesso!"
else
    echo -e "\n❌ Erro ao atualizar query (HTTP $HTTP_CODE)"
fi