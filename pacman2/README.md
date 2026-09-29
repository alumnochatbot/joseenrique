# 🕹️ Pac-Man Clásico en HTML5, CSS3 y JavaScript

Una recreación fiel, moderna y autocontenida del clásico videojuego de recreativa **Pac-Man**, construida íntegramente con tecnologías web estándar (HTML5 Canvas, CSS3 y JavaScript puro ES6).

---

## 🚀 Cómo Jugar

No requiere instalación, Node.js ni librerías externas.

1. Abre el archivo [`index.html`](file:///c:/Users/TEACHER%20-%20EXTENSION/Documents/antigravity/pacman/index.html) directamente en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).
2. Haz clic en **JUGAR** o presiona la tecla **ESPACIO** o **ENTER**.
3. ¡Come todos los puntos y evita a los fantasmas!

---

## 🎮 Controles

| Acción | Teclado | Controles Táctiles / Ratón |
| :--- | :--- | :--- |
| **Moverse Arriba** | Flecha Arriba (`↑`) o `W` | Botón `▲` en el D-Pad |
| **Moverse Abajo** | Flecha Abajo (`↓`) o `S` | Botón `▼` en el D-Pad |
| **Moverse a la Izquierda** | Flecha Izquierda (`←`) o `A` | Botón `◀` en el D-Pad |
| **Moverse a la Derecha** | Flecha Derecha (`→`) o `D` | Botón `▶` en el D-Pad |
| **Pausar / Continuar** | Tecla `P` | Botón de pausa (`⏸️`) |
| **Comenzar / Reiniciar** | Tecla `Espacio` o `Enter` | Botón `🔄` |
| **Silenciar / Activar Sonido** | - | Botón `🔊` / `🔇` |

---

## ✨ Características Principales

* **Efectos de Sonido 100% Sintetizados:** Utiliza la **Web Audio API** nativa para generar sonidos retro chiptune auténticos en tiempo real (waka-waka al comer, sirena de energizante, comer fantasmas, música de nivel completado y sonido clásico de derrota), sin depender de archivos de audio externos.
* **Inteligencia Artificial de los 4 Fantasmas Clásicos:**
  * 🔴 **Blinky (Rojo):** Persecución tenaz hacia la casilla exacta de Pac-Man.
  * 🌸 **Pinky (Rosa):** Emboscada anticipada (apunta casillas por delante de Pac-Man).
  * 💎 **Inky (Cian):** Patrullaje impredecible y flanqueo.
  * 🍊 **Clyde (Naranja):** Tímido (persigue si está lejos, huye a su esquina si se acerca demasiado).
* **Modo Asustado / Energizantes:** Al comer una píldora de poder grande, los fantasmas se vuelven azules y vulnerables. Pac-Man puede comerlos para obtener puntuación multiplicada (+200, +400, +800, +1600).
* **Túnel de Transporte Lateral:** Permite cruzar de un lado al otro del laberinto (con ralentización para los fantasmas).
* **Fruta de Bonificación (Cereza Clásica):** Aparece temporalmente durante la partida para otorgar +100 puntos extra.
* **Persistencia de Puntuación Récord:** Guarda el récord máximo (`HIGH SCORE`) automáticamente en `localStorage`.
* **Diseño Arcade Responsivo:**
  * Marco retro tipo mueble arcade con iluminación de neón.
  * Controles D-pad táctiles integrados para jugar en móviles o pantallas táctiles.

---

## 📁 Estructura del Proyecto

* [`index.html`](file:///c:/Users/TEACHER%20-%20EXTENSION/Documents/antigravity/pacman/index.html): Maquetación del juego, cabecera de puntuaciones, canvas y modales de estado.
* [`style.css`](file:///c:/Users/TEACHER%20-%20EXTENSION/Documents/antigravity/pacman/style.css): Estilos visuales con estética arcade CRT neón y diseño adaptable.
* [`game.js`](file:///c:/Users/TEACHER%20-%20EXTENSION/Documents/antigravity/pacman/game.js): Lógica del juego, motor de renderizado Canvas, IA de fantasmas, bucle a 60 FPS y sintetizador de sonido.
