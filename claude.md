# Context App Wiki — Schema

## Bu vault ne

context-app projesinin LLM-maintained wiki'si.  
Ham kaynak: `C:\Users\Administrator\Desktop\context-app`  
Wiki: `wiki/` klasörü

## Her oturum başında yap

1. `wiki/index.md` oku
2. Görevle ilgili wiki sayfasını oku
3. Sadece o ilgili kaynak dosyayı aç — tüm kodu okuma

## Token tasarrufu kuralları

- `node_modules/`, `.next/`, `package-lock.json` **asla** okuma
- Wiki sayfası varsa, kaynak dosyayı okuma
- Değişiklik sonrası ilgili wiki sayfasını güncelle
- Yeni modül eklendiyse wiki'ye yeni sayfa ekle, index.md'yi güncelle

## Proje özeti (tek satır)

Next.js 14 App Router + TypeScript + Zustand + compromise.js. $0 maliyet. Tüm data localStorage'da. Çeviri: Free Dictionary + Lesk + Lingva + MyMemory. SRS: simplified SM-2.

## Dizin yapısı

```
wiki/
  index.md          ← her oturumun başlangıç noktası
  overview.md       ← genel mimari, routes, upgrade planları
  types.md          ← VocabularyEntry, WordMeaning, AppSettings tipleri
  lib-storage.md    ← localStorage API, Zustand store (vocabulary + reader)
  lib-srs.md        ← SM-2 algoritması, scheduler, 4 challenge tipi
  lib-translation.md ← çeviri motoru, dictionary, MyMemory, POS heuristic, tokenizer
  components.md     ← UI bileşenleri özeti
  pages.md          ← app sayfaları: home, read, review, words
  data-flow.md      ← veri akışı haritası, store bağlantıları
  dev-guide.md      ← geliştirici tarif kartları
raw/                ← ham kaynaklar (okunur, değiştirilmez)
```

## Değişiklik sonrası wiki güncelleme

| Değişen dosya | Güncelle |
|---|---|
| types/index.ts | wiki/types.md |
| lib/storage/ | wiki/lib-storage.md |
| lib/srs/ | wiki/lib-srs.md |
| lib/translation/ | wiki/lib-translation.md |
| app/*/page.tsx | wiki/pages.md |
| components/ | wiki/components.md |
| Yeni veri akışı | wiki/data-flow.md |
