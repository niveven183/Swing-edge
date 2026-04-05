"""Structured logging helper."""
from __future__ import annotations

import logging
import sys

from config.settings import LOG_LEVEL

_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)-22s | %(message)s"


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(LOG_LEVEL)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMAT))
    logger.addHandler(handler)
    logger.propagate = False
    return logger
