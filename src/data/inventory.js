// data/inventory.js
const { v4: uuid } = require("uuid");

let inventory = [
  {
    id: uuid(),
    name: "Milk",
    category: "DAIRY",
    quantity: 20,
    expiryDate: "2025-12-20",
    storageLocation: "FRIDGE",
    minStockLevel: 10,
    maxStockLevel: 100,
    costPerUnit: 40
  },
  {
    id: uuid(),
    name: "Chicken",
    category: "MEAT",
    quantity: 8,
    expiryDate: "2025-12-17",
    storageLocation: "FREEZER",
    minStockLevel: 5,
    maxStockLevel: 50,
    costPerUnit: 220
    },
    {
    id: uuid(),
    name: "Apples",
    category: "PRODUCE",
    quantity: 50,
    expiryDate: "2026-01-10",
    storageLocation: "PANTRY",
    minStockLevel: 20,
    maxStockLevel: 40,
    costPerUnit: 15
    },
    {
    id: uuid(),
        name: "Yogurt",
    category: "DAIRY",
    quantity: 0,
    expiryDate: "2025-12-15",
    storageLocation: "FRIDGE",
    minStockLevel: 10,
    maxStockLevel: 80,
    costPerUnit: 30
    },
    {
    id: uuid(),
    name: "Broccoli",
    category: "PRODUCE",
    quantity: 5,
    expiryDate: "2025-12-18",
    storageLocation: "FRIDGE",
    minStockLevel: 10,
    maxStockLevel: 60,
    costPerUnit: 25 
    }
];

module.exports = inventory;
