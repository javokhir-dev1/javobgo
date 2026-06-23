#!/bin/bash
# Rate limiting test — 35 ta fake komment yuboradi
# Ishlatish: bash test-rate-limit.sh

BASE_URL="http://localhost:3001/webhook"
POST_ID="123456789"         # ixtiyoriy post ID
BOT_ACCOUNT_ID="000000000"  # .env dagi INSTAGRAM_BUSINESS_ACCOUNT_ID dan FARQLI bo'lsin

TOTAL=35  # 30 initial + 5 ta (dynamic delay tekshirish uchun)

echo "=== Rate Limit Test: $TOTAL ta komment yuboriladi ==="
echo "Birinchi 30 ta: 5-10s random delay"
echo "31-35 ta: hourly limit tekshiruvi (dynamic delay)"
echo ""

for i in $(seq 1 $TOTAL); do
  PAYLOAD=$(cat <<EOF
{
  "object": "instagram",
  "entry": [{
    "id": "entry_$i",
    "changes": [{
      "field": "comments",
      "value": {
        "id": "comment_$i",
        "text": "Test komment #$i — sotib olmoqchi",
        "from": {
          "id": "user_$i",
          "username": "testuser$i"
        },
        "media": {
          "id": "$POST_ID"
        }
      }
    }]
  }]
}
EOF
)

  TIMESTAMP=$(date '+%H:%M:%S')
  echo "[$TIMESTAMP] Komment #$i yuborilmoqda..."

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  echo "[$TIMESTAMP] Komment #$i -> HTTP $RESPONSE"

  # Kommentlar orasida 0.5s kutish (webhook simulatsiyasi)
  if [ $i -lt $TOTAL ]; then
    sleep 0.5
  fi
done

echo ""
echo "=== Test yakunlandi. Backend loglarini tekshiring ==="
