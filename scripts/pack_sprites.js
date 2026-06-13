#!/usr/bin/env node
/**
 * Node script to pack rendered sprites into a Phaser 3 atlas
 * Goes with the Python Blender script: render_sprites.py
 */

const fs = require('fs');
const path = require('path');

class SpritePacker {
    constructor(inputDir, outputDir) {
        this.inputDir = inputDir;
        this.outputDir = outputDir;
        this.sprites = [];
        this.atlas = {
            frames: {},
            meta: {
                image: "packed_sprites.png",
                format: "RGBA8888",
                size: { w: 1024, h: 1024 },
                scale: "1"
            }
        };
    }

    // Load all rendered PNG files
    loadSprites() {
        if (!fs.existsSync(this.inputDir)) {
            throw new Error(`Input directory does not exist: ${this.inputDir}`);
        }

        const files = fs.readdirSync(this.inputDir);
        const pngFiles = files.filter(file => file.endsWith('.png') && file.startsWith('model_rot_'));

        if (pngFiles.length === 0) {
            throw new Error('No PNG files found in the input directory');
        }

        // Load each sprite
        pngFiles.forEach((file, index) => {
            const imagePath = path.join(this.inputDir, file);
            const stats = fs.statSync(imagePath);
            
            // For now, assume all sprites are the same size
            // In a real implementation, we'd get actual dimensions
            this.sprites.push({
                name: path.basename(file, '.png'),
                path: imagePath,
                width: 64,
                height: 64,
                x: 0,
                y: 0
            });
        });

        console.log(`Loaded ${this.sprites.length} sprites`);
    }

    // Simple packing algorithm (2x grid for 8 sprites)
    packSprites() {
        const spriteSize = 64;
        const padding = 2;
        const spritesPerRow = 2;
        const spritesPerCol = 4;
        
        let x = 0;
        let y = 0;

        this.sprites.forEach((sprite, index) => {
            sprite.x = x;
            sprite.y = y;

            // Position next sprite
            x += spriteSize + padding;
            if (x >= spritesPerRow * (spriteSize + padding)) {
                x = 0;
                y += spriteSize + padding;
            }
        });

        console.log('Packed sprites into atlas');
    }

    // Generate atlas JSON file
    generateAtlasJSON() {
        this.sprites.forEach(sprite => {
            this.atlas.frames[sprite.name] = {
                frame: { x: sprite.x, y: sprite.y, w: sprite.width, h: sprite.height },
                sourceSize: { w: sprite.width, h: sprite.height },
                rotated: false,
                trimmed: false
            };
        });
    }

    // Save atlas JSON file
    saveAtlas() {
        const outputPath = path.join(this.outputDir, 'atlas.json');
        
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(this.atlas, null, 2));
        console.log(`Atlas saved to: ${outputPath}`);
    }

    // Copy all PNG files to output directory
    copySprites() {
        this.sprites.forEach(sprite => {
            const outputPath = path.join(this.outputDir, sprite.name + '.png');
            fs.copyFileSync(sprite.path, outputPath);
        });
        console.log('Copied all sprites to output directory');
    }

    // Run the packing process
    run() {
        try {
            this.loadSprites();
            this.packSprites();
            this.generateAtlasJSON();
            this.saveAtlas();
            this.copySprites();
            
            console.log('Sprite packing completed successfully!');
        } catch (error) {
            console.error('Error packing sprites:', error.message);
            process.exit(1);
        }
    }
}

// Main execution
if (require.main === module) {
    const inputDir = path.join(__dirname, '..', 'assets', 'sprites');
    const outputDir = path.join(__dirname, '..', 'assets', 'sprites');
    
    const packer = new SpritePacker(inputDir, outputDir);
    packer.run();
}

module.exports = SpritePacker;