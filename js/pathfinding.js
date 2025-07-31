// js/pathfinding.js

// Konstanta untuk pathfinding
const GRID_CELL_SIZE = 25; // Ukuran setiap sel di grid. Sesuaikan untuk performa vs akurasi

// Fungsi untuk membuat grid navigasi dari konfigurasi map
export function createNavGrid(worldWidth, worldHeight, walls) {
    const cols = Math.floor(worldWidth / GRID_CELL_SIZE);
    const rows = Math.floor(worldHeight / GRID_CELL_SIZE);
    const grid = [];

    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        for (let x = 0; x < cols; x++) {
            grid[y][x] = {
                x: x, y: y, isWall: false, g: 0, h: 0, f: 0, parent: null
            };
        }
    }

    // Tandai sel yang tertutup tembok sebagai tidak bisa dilewati
    walls.forEach(wall => {
        const startCol = Math.floor(wall.x / GRID_CELL_SIZE);
        const endCol = Math.ceil((wall.x + wall.width) / GRID_CELL_SIZE);
        const startRow = Math.floor(wall.y / GRID_CELL_SIZE);
        const endRow = Math.ceil((wall.y + wall.height) / GRID_CELL_SIZE);

        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                if (grid[y] && grid[y][x]) {
                    grid[y][x].isWall = true;
                }
            }
        }
    });

    return grid;
}

// Heuristik Manhattan Distance untuk menghitung jarak estimasi
function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Implementasi Algoritma A*
export function findPath(startPos, endPos, grid) {
    const cols = grid[0].length;
    const rows = grid.length;

    // Reset grid nodes untuk pencarian baru
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            grid[y][x].g = 0; grid[y][x].h = 0; grid[y][x].f = 0; grid[y][x].parent = null;
        }
    }

    const startCol = Math.floor(startPos.x / GRID_CELL_SIZE);
    const startRow = Math.floor(startPos.y / GRID_CELL_SIZE);
    const endCol = Math.floor(endPos.x / GRID_CELL_SIZE);
    const endRow = Math.floor(endPos.y / GRID_CELL_SIZE);
    
    if (!grid[startRow] || !grid[startRow][startCol] || !grid[endRow] || !grid[endRow][endCol]) {
        console.error("Tujuan atau titik awal berada di luar peta.");
        return null;
    }

    const startNode = grid[startRow][startCol];
    const endNode = grid[endRow][endCol];

    if (endNode.isWall || startNode.isWall) return null; // Tidak bisa mulai atau berakhir di tembok

    const openList = [startNode];
    const closedList = new Set();

    while (openList.length > 0) {
        let lowestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[lowestIndex].f) lowestIndex = i;
        }
        const currentNode = openList[lowestIndex];

        if (currentNode === endNode) {
            const path = [];
            let temp = currentNode;
            while (temp) {
                path.push({
                    x: temp.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
                    y: temp.y * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
                });
                temp = temp.parent;
            }
            return path.reverse();
        }

        openList.splice(lowestIndex, 1);
        closedList.add(currentNode);

        const neighbors = [];
        const { x, y } = currentNode;
        if (grid[y - 1] && grid[y - 1][x]) neighbors.push(grid[y - 1][x]);
        if (grid[y + 1] && grid[y + 1][x]) neighbors.push(grid[y + 1][x]);
        if (grid[y] && grid[y][x - 1]) neighbors.push(grid[y][x - 1]);
        if (grid[y] && grid[y][x + 1]) neighbors.push(grid[y][x + 1]);

        for (const neighbor of neighbors) {
            if (neighbor.isWall || closedList.has(neighbor)) continue;

            const gScore = currentNode.g + 1;
            let isNewPath = false;
            if (openList.includes(neighbor)) {
                if (gScore < neighbor.g) {
                    neighbor.g = gScore; isNewPath = true;
                }
            } else {
                neighbor.g = gScore; isNewPath = true; openList.push(neighbor);
            }

            if (isNewPath) {
                neighbor.h = heuristic(neighbor, endNode);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;
            }
        }
    }

    return null; // Tidak ditemukan path
}