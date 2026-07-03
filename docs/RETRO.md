# 회고

## #1 리포 부트스트랩
로컬 기본 Node(20.20.2)가 pnpm 11.8.0 요구사항(22.13+)보다 낮아 매 명령을 `nvm use 22`로 감싸야 했다 — `.nvmrc` 추가로 문서화했지만, 다음 이슈부터는 셸 진입 시 자동 적용되는지 확인할 것. Next.js build가 `eslint-config-next` 없이도 통과는 하지만 경고를 남김 — 실제 웹 UI 작업 시작하는 이슈(#8/#9)에서 추가.

## #2 API 픽스처 파서
resultCode≠00인 XML 에러 응답을 실호출로 한 번도 못 만났다 (관측된 에러는 전부 401/504 비XML 인프라 실패) — synthetic fixture로 대체했는데, 나중에 진짜 에러코드 응답을 우연히 만나면 실제 픽스처로 교체하고 synthetic은 지울 것. 두 파서가 envelope 파싱을 공유하니 이슈 #6에서 재시도/백오프 로직을 짤 때도 `ParseError` 타입 3종(NOT_XML/API_ERROR/MALFORMED_XML)을 그대로 분기 기준으로 재사용하면 될 듯.
