#!/bin/sh

node $@ 2>&1 | bunyan
