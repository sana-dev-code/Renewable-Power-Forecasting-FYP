# models.py
from tortoise import fields
from tortoise.models import Model

class Forecast(Model):
    id = fields.IntField(pk=True)

    # user inputs
    location = fields.CharField(max_length=120)
    panel_type = fields.CharField(max_length=20)  # "Mono" | "Poly" | "Thin-Film"
    panel_count = fields.IntField()
    forecast_days = fields.IntField()

    # meta/outputs (compact storage for user page)
    confidence = fields.CharField(max_length=10, null=True)   # high/medium/low
    daily_json = fields.JSONField(null=True)                  # list[{date, total_kWh}]
    lat = fields.FloatField(null=True)
    lon = fields.FloatField(null=True)
    artifacts = fields.CharField(max_length=40, null=True)    # "ml" | "baseline"

    created_at = fields.DatetimeField(auto_now_add=True)
