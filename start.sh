#!/bin/bash

node $@ 2>&1 | bunyan
