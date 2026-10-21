/**
 * Build a medida de Phaser para producción (vite.config.ts lo usa como alias
 * de `phaser` sólo en `vite build`; en desarrollo se usa el Phaser completo,
 * que es un superconjunto con la misma API).
 *
 * Parte de la entrada mínima oficial (phaser/src/phaser-core.js) y agrega
 * sólo los GameObjects que usa el juego. Afuera quedan Matter/Arcade physics,
 * el SoundManager de Phaser (el juego sintetiza con WebAudio propio), el
 * renderer Canvas, tilemaps, partículas de Phaser, plugins 3D, etc.
 *
 * Si se usa un GameObject nuevo (scene.add.xxx), hay que agregarlo acá con
 * su Factory/Creator, o falla en el build de producción.
 */
import 'phaser/src/polyfills/requestVideoFrame.js';
import CONST from 'phaser/src/const.js';
import Extend from 'phaser/src/utils/object/Extend.js';

import Animations from 'phaser/src/animations/index.js';
import BlendModes from 'phaser/src/renderer/BlendModes.js';
import Cache from 'phaser/src/cache/index.js';
import Scene2D from 'phaser/src/cameras/2d/index.js';
import Core from 'phaser/src/core/index.js';
import Class from 'phaser/src/utils/Class.js';
import Data from 'phaser/src/data/index.js';
import Masks from 'phaser/src/display/mask/index.js';
import DOM from 'phaser/src/dom/index.js';
import Events from 'phaser/src/events/index.js';
import FX from 'phaser/src/fx/index.js';
import Game from 'phaser/src/core/Game.js';
import Input from 'phaser/src/input/index.js';
import LoaderPlugin from 'phaser/src/loader/LoaderPlugin.js';
import Plugins from 'phaser/src/plugins/index.js';
import Renderer from 'phaser/src/renderer/index.js';
import Scale from 'phaser/src/scale/index.js';
import ScaleModes from 'phaser/src/renderer/ScaleModes.js';
import Scene from 'phaser/src/scene/Scene.js';
import Scenes from 'phaser/src/scene/index.js';
import Structs from 'phaser/src/structs/index.js';
import Textures from 'phaser/src/textures/index.js';
import Time from 'phaser/src/time/index.js';
import Tweens from 'phaser/src/tweens/index.js';

// GameObjects base (igual que phaser-core).
import DisplayList from 'phaser/src/gameobjects/DisplayList.js';
import GameObjectCreator from 'phaser/src/gameobjects/GameObjectCreator.js';
import GameObjectFactory from 'phaser/src/gameobjects/GameObjectFactory.js';
import UpdateList from 'phaser/src/gameobjects/UpdateList.js';
import Components from 'phaser/src/gameobjects/components/index.js';
import BuildGameObject from 'phaser/src/gameobjects/BuildGameObject.js';
import GameObject from 'phaser/src/gameobjects/GameObject.js';
import Graphics from 'phaser/src/gameobjects/graphics/Graphics.js';
import Image from 'phaser/src/gameobjects/image/Image.js';
import Text from 'phaser/src/gameobjects/text/Text.js';
import 'phaser/src/gameobjects/graphics/GraphicsFactory.js';
import 'phaser/src/gameobjects/graphics/GraphicsCreator.js';
import 'phaser/src/gameobjects/image/ImageFactory.js';
import 'phaser/src/gameobjects/image/ImageCreator.js';
import 'phaser/src/gameobjects/text/TextFactory.js';
import 'phaser/src/gameobjects/text/TextCreator.js';

// GameObjects extra que usa el juego.
import Blitter from 'phaser/src/gameobjects/blitter/Blitter.js';
import Bob from 'phaser/src/gameobjects/blitter/Bob.js';
import 'phaser/src/gameobjects/blitter/BlitterFactory.js';
import BitmapText from 'phaser/src/gameobjects/bitmaptext/static/BitmapText.js';
import RetroFont from 'phaser/src/gameobjects/bitmaptext/RetroFont.js';
import 'phaser/src/gameobjects/bitmaptext/static/BitmapTextFactory.js';
import Container from 'phaser/src/gameobjects/container/Container.js';
import 'phaser/src/gameobjects/container/ContainerFactory.js';
import NineSlice from 'phaser/src/gameobjects/nineslice/NineSlice.js';
import 'phaser/src/gameobjects/nineslice/NineSliceFactory.js';
import Rectangle from 'phaser/src/gameobjects/shape/rectangle/Rectangle.js';
import 'phaser/src/gameobjects/shape/rectangle/RectangleFactory.js';

const Phaser = {
  Animations,
  BlendModes,
  Cache,
  Cameras: { Scene2D },
  Core,
  Class,
  Data,
  Display: { Masks },
  DOM,
  Events,
  FX,
  Game,
  GameObjects: {
    DisplayList,
    GameObjectCreator,
    GameObjectFactory,
    UpdateList,
    Components,
    BuildGameObject,
    GameObject,
    Graphics,
    Image,
    Text,
    Blitter,
    Bob,
    BitmapText,
    RetroFont,
    Container,
    NineSlice,
    Rectangle,
  },
  Input,
  Loader: { LoaderPlugin },
  Plugins,
  Renderer,
  Scale,
  ScaleModes,
  Scene,
  Scenes,
  Structs,
  Textures,
  Time,
  Tweens,
};

export default Extend(false, Phaser, CONST);
