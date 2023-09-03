#!/bin/bash

# Check if filename and variable name are provided
if [[ $# -lt 2 ]]; then
  echo "Usage: ./deploy.sh <deployment_script> <variable_name> <new_value>"
  exit 1
fi

# Store filename, variable name and new value in variables
FILE_NAME=".env"
SCRIPT_NAME=$1
VAR_NAME=$2
NEW_VALUE=$3

# Check if script file exists
if [[ ! -f "$SCRIPT_NAME" ]]; then
  echo "Script not found: $SCRIPT_NAME"
  exit 1
fi

# Check if env file exists
if [[ ! -f "$FILE_NAME" ]]; then
  echo "Env file not found: $FILE_NAME"
  exit 1
fi

# Run the deployment script and capture its output
OUTPUT=$(npx hardhat run --network mumbai $SCRIPT_NAME)

# Extract the contract address from the output using grep
CONTRACT_ADDRESS=$(echo "$OUTPUT" | sed -n 's/.*contract address: \(0x[[:xdigit:]]*\).*/\1/p')

# Check if a contract address was found
if [[ -n "$CONTRACT_ADDRESS" ]]; then
  echo "Found contract address: $CONTRACT_ADDRESS"
  NEW_VALUE=$CONTRACT_ADDRESS
else
  echo "Contract address not found"
fi

if grep -q "export $VAR_NAME=" "$FILE_NAME"; then
  sed -i "" "s|export $VAR_NAME=.*|export $VAR_NAME=$NEW_VALUE|" "$FILE_NAME"
  echo "Variable $VAR_NAME in file $FILE_NAME has been replaced with $NEW_VALUE"
elif grep -q "$VAR_NAME=" "$FILE_NAME"; then
  sed -i "" "s|$VAR_NAME=.*|$VAR_NAME=$NEW_VALUE|" "$FILE_NAME"
  echo "Variable $VAR_NAME in file $FILE_NAME has been replaced with $NEW_VALUE"
else
  echo "Variable $VAR_NAME not found in file $FILE_NAME"
  exit 1
fi

echo "Variable $VAR_NAME in file .env has been replaced with $NEW_VALUE"
