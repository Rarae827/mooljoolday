// 항상 최신 버전으로 열리게 하는 장치
// 배포할 때 index.html의 data-version과 version.json에 같은 버전 번호가 찍힙니다.
// 브라우저가 예전 index.html을 캐시해 뒀다면, 서버의 최신 버전 번호와 비교해서
// 다르면 주소에 ?v=최신버전 을 붙여 다시 불러옵니다. (주소가 달라지면 캐시를 쓰지 않음)
(function () {
  var current = document.documentElement.getAttribute('data-version') || '';
  // 로컬 개발 중(버전이 아직 안 찍힘)에는 검사하지 않음
  if (!current || current.charAt(0) === '_') return;

  var url = 'version.json?t=' + Date.now();
  fetch(url, { cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (info) {
      if (!info || !info.version || info.version === current) return;
      var next = new URL(window.location.href);
      // 같은 버전으로 이미 한 번 다시 불러왔다면 무한 반복하지 않음
      if (next.searchParams.get('v') === info.version) return;
      next.searchParams.set('v', info.version);
      window.location.replace(next.toString());
    })
    .catch(function () { /* 오프라인 등: 그냥 지금 버전으로 진행 */ });
})();
