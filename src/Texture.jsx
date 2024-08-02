// Textures.jsx
import { useTexture } from '@react-three/drei';

export function useTextures() {
  // Load all the textures
  const colorMap = useTexture('./Wood018_1K-JPG/Wood018_1K-JPG_Color.jpg');
  const normalMapDX = useTexture('./Wood018_1K-JPG/Wood018_1K-JPG_NormalDX.jpg');
  const normalMapGL = useTexture('./Wood018_1K-JPG/Wood018_1K-JPG_NormalGL.jpg');
  const roughnessMap = useTexture('./Wood018_1K-JPG/Wood018_1K-JPG_Roughness.jpg');
  const displacementMap = useTexture('./Wood018_1K-JPG/Wood018_1K-JPG_Displacement.jpg');

  const McolorMap = useTexture('./Metal034_1K-JPG/Metal034_1K-JPG_Color.jpg');
  const MnormalMapDX = useTexture('./Metal034_1K-JPG/Metal034_1K-JPG_NormalDX.jpg');
  const MnormalMapGL = useTexture('./Metal034_1K-JPG/Metal034_1K-JPG_NormalGL.jpg');
  const MroughnessMap = useTexture('./Metal034_1K-JPG/Metal034_1K-JPG_Roughness.jpg');
  const MdisplacementMap = useTexture('./Metal034_1K-JPG/Metal034_1K-JPG_Displacement.jpg');

  const PcolorMap = useTexture('./Rubber004_1K-JPG/Rubber004_1K-JPG_Color.jpg');
  const PnormalMapDX = useTexture('./Rubber004_1K-JPG/Rubber004_1K-JPG_NormalDX.jpg');
  const PnormalMapGL = useTexture('./Rubber004_1K-JPG/Rubber004_1K-JPG_NormalGL.jpg');
  const ProughnessMap = useTexture('./Rubber004_1K-JPG/Rubber004_1K-JPG_Roughness.jpg');
  const PdisplacementMap = useTexture('./Rubber004_1K-JPG/Rubber004_1K-JPG_Displacement.jpg');

  return {
    colorMap,
    normalMapDX,
    normalMapGL,
    roughnessMap,
    displacementMap,
    McolorMap,
    MnormalMapDX,
    MnormalMapGL,
    MroughnessMap,
    MdisplacementMap,
    PcolorMap,
    PnormalMapDX,
    PnormalMapGL,
    ProughnessMap,
    PdisplacementMap,
  };
}
