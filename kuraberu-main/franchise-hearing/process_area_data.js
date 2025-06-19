#!/usr/bin/env node

// Script to process KEN_ALL.csv and generate area data for the franchise system
const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = '/Users/ryuryu/Documents/KEN_ALL.csv';
const csvData = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV data into structured format
const lines = csvData.split('\n').filter(line => line.trim());
const areaData = {};

console.log(`Processing ${lines.length} lines of postal code data...`);

lines.forEach((line, index) => {
    if (index % 10000 === 0) {
        console.log(`Processing line ${index}...`);
    }
    
    const columns = line.split(',');
    if (columns.length >= 6) {
        const prefecture = columns[3];
        const city = columns[4]; 
        const town = columns[5];
        
        // Skip empty or invalid entries
        if (!prefecture || !city || prefecture === '都道府県') {
            return;
        }
        
        // Initialize prefecture if not exists
        if (!areaData[prefecture]) {
            areaData[prefecture] = {};
        }
        
        // Initialize city if not exists
        if (!areaData[prefecture][city]) {
            areaData[prefecture][city] = { towns: [] };
        }
        
        // Add town if it's valid and not already exists
        if (town && town !== 'town' && town !== '以下に掲載がない場合' && 
            !areaData[prefecture][city].towns.includes(town)) {
            areaData[prefecture][city].towns.push(town);
        }
    }
});

// Sort towns alphabetically for each city
Object.keys(areaData).forEach(prefecture => {
    Object.keys(areaData[prefecture]).forEach(city => {
        areaData[prefecture][city].towns.sort();
    });
});

// Generate the JavaScript function
const jsOutput = `async function loadAreaData() {
    return ${JSON.stringify(areaData, null, 8)};
}`;

// Write to output file
const outputPath = '/Users/ryuryu/franchise-hearing/area_data_complete.js';
fs.writeFileSync(outputPath, jsOutput);

console.log('\n=== PROCESSING COMPLETE ===');
console.log(`Total prefectures: ${Object.keys(areaData).length}`);

// Show statistics for some prefectures
['神奈川県', '東京都', '大阪府', '愛知県'].forEach(pref => {
    if (areaData[pref]) {
        const cities = Object.keys(areaData[pref]);
        const totalTowns = cities.reduce((sum, city) => sum + areaData[pref][city].towns.length, 0);
        console.log(`${pref}: ${cities.length} cities, ${totalTowns} towns`);
    }
});

console.log(`\nOutput written to: ${outputPath}`);
console.log('Ready to update FranchiseHearingAI_Frontend.html');