# 🥊 METZ FIGHTER — Web Demo

Jogo de luta 2D no navegador, com os sprites dos personagens e o background da Metz.

## 🎮 Controles

| Tecla | Ação |
|-------|------|
| `J` | Soco |
| `K` | Chute |
| `L` (segurar) | Bloquear |
| `SPACE` | Pular |
| `← / A` | Mover Esquerda |
| `→ / D` | Mover Direita |
| `S` + `D` + `J` | **Golpe Especial** |

## 🗂️ Estrutura

```
metz-fighter/
├── index.html
├── style.css
├── game.js
├── player.js
├── input.js
├── sprites/
│   └── p1/
│       ├── idle.png
│       ├── stance.png
│       ├── punch.png
│       ├── kick.png
│       └── jump.png
└── background/
    └── stage.png
```

## 🎨 Adicionando sprites do P2

Coloque os sprites da personagem feminina em `sprites/p2/` com os mesmos nomes:
- `idle.png`, `stance.png`, `punch.png`, `kick.png`, `jump.png`

E no `game.js`, atualize `cpu.loadSprites({...})` para apontar para `sprites/p2/`.

## 🚀 Como rodar

Abra `index.html` em qualquer servidor local (ex: Live Server no VS Code)
ou suba no GitHub Pages.

> ⚠️ Não funciona abrindo o arquivo diretamente pelo File Explorer por causa do CORS nas imagens.
