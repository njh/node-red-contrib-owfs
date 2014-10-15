#!/bin/sh

exec owserver \
  --foreground \
  --Celsius \
  --error_print=2 \
  --error_level=4 \
  --fake=DS18B20,DS18B20,DS2405,DS18S20
