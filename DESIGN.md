# ORBIT 웹 에뮬레이터

## 1. 정체성
기존 FM-1 faceplate와 실제 C 화면을 유지합니다. ORBIT 역할은 [펌웨어 디자인](https://github.com/dspaudio/orbit/blob/main/DESIGN.md)을 따릅니다. SLOOP와 Felucca 비교 화면은 보존합니다.

## 2. 색
ORBIT의 K1–K4 pointer는 `#287cff`, `#1ecc70`, `#ffffff`, `#ff621a`입니다. 비교 펌웨어는 기존 색을 유지합니다. 화면의 PASTEL·NEON·단색 설정은 실제 C 팔레트가 결정합니다.

## 3. 글자
기존 monospace UI를 유지합니다. `Orbit` 워드마크만 시스템 sans-serif, weight 100을 사용하며 버전·물리 키 label과 구분합니다.

## 4. 배치
기존 963×588 panel 좌표와 `fitDevice` 반응형 배치를 유지합니다. 240×240 화면은 실제 WebAssembly framebuffer입니다.

## 5. 조작
기존 `.cap`, `.btn`, keybed와 POWER를 재사용합니다. encoder·tap·hold·pressed 표시가 실제 worklet 입력과 연결되어야 합니다. HOME은 Event Tape, EDIT / ENV / FX / LFO는 sound 모듈, Tape의 GLO는 Mixer입니다.

## 6. 움직임
기존 knob 회전과 LCD 갱신을 유지합니다. 소리는 POWER 뒤 실제 AudioWorklet에서 시작하며 splash는 오디오 입력을 대체하지 않습니다.

## 7. 표면
기존 기기 shell·knob·bezel의 재질과 깊이를 유지합니다. 장식적인 OP-1 컨트롤을 추가하지 않습니다.

## 8. 검증과 한계
390px touch와 1440px desktop에서 부트·실제 화면·물리 키·소리를 확인합니다. 기존 dark-only shell과 물리 panel 접근성 제약은 이번 버전 배포에서 재설계하지 않습니다. 브라우저 검증은 FM-1 실기기 검증이 아닙니다.
