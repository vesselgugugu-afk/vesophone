import { useDatingPlayer } from '@/composables/useDatingPlayer'

const builtinAvatars = [
  "https://i.postimg.cc/6525jm6W/072bfe1295d9d49b68f5858b81a45430.jpg",
  "https://i.postimg.cc/DyJyjMfZ/09806298221236144e6a3428fc0c2e44.jpg",
  "https://i.postimg.cc/MZrpYSS3/0982a02c7590f58ba0891a951276d964.jpg",
  "https://i.postimg.cc/sf0gJrzD/1253a4a34575cdb18f8a9d91ac7b5687.jpg",
  "https://i.postimg.cc/X7G7HzNq/13ada1a3dbb6c57f8fec1c386ea31546.jpg",
  "https://i.postimg.cc/2jXSxDYY/1d95efc778a65ee7f0588ba0ee8e4f9b.jpg",
  "https://i.postimg.cc/m2z2X5Z7/2326aeaaf6ddfd75f6b9ce33c48b3dca.jpg",
  "https://i.postimg.cc/MKMKPFZK/3c948e199d54245a04f4c1d116bbb9bb.jpg",
  "https://i.postimg.cc/YqGqns26/3d5a76d67bd9c4bdfd7f4c083bda8a16.jpg",
  "https://i.postimg.cc/G3SmjCRn/6edf50e73cac056ff463aad380e9884b.jpg",
  "https://i.postimg.cc/sf0gJrzB/7189504cc30b792b044b33e7f7a86c7c.jpg",
  "https://i.postimg.cc/59k2mVJM/7875a32abf4312cdb5c04d4abc459b72.jpg",
  "https://i.postimg.cc/c15LcSW8/7a2ad00e8532cdb4d9bd1b21ba9ad01c.jpg",
  "https://i.postimg.cc/nVwh1Jxj/7c3bb7ea4308f770dafb77f37eaa5ebb.jpg",
  "https://i.postimg.cc/J4D4627Z/7c76415c388d078115056c23ce24b858.jpg",
  "https://i.postimg.cc/fWgRvNsW/7d0062f8514cdf16280a227b0c0ebc18.jpg",
  "https://i.postimg.cc/wTyTfGxw/7d80f133516bd6e04649648a575d70a9.jpg",
  "https://i.postimg.cc/FFnHx4vr/83c59c19f82465b0469dc122a921b4a5.jpg",
  "https://i.postimg.cc/G3SmjCCW/84ea9b88f42dfe8587e6e441cb4084cb.jpg",
  "https://i.postimg.cc/jdwdgFqw/953df3274c338a9950ee5ab8f1ded2f5.jpg",
  "https://i.postimg.cc/3J4JScrp/973ddf60a45f70350678ec6171458a88.jpg",
  "https://i.postimg.cc/Kcs852bR/9d6bff71df8b201d9a794c9bd743c7bd.jpg",
  "https://i.postimg.cc/PfF5MjHN/9e35d7ae468988f969ad4c762d75a8a0.jpg",
  "https://i.postimg.cc/FsdsWBFZ/a08b6a7adb84c3669ea28e61fdf4ccf0.jpg",
  "https://i.postimg.cc/fTtT2rWC/a660f4b00439caa732a6935dffd4af3c.jpg",
  "https://i.postimg.cc/xjF1P2Qr/a99d5167a170e40adcb6d7cd931035e9.jpg",
  "https://i.postimg.cc/PfF5MjH5/b31f7ac42135418700437cd96f0985e3.jpg",
  "https://i.postimg.cc/y6r8THK3/b3debbfb7743d0ed2d27e75511f450d8.jpg",
  "https://i.postimg.cc/SN2NTvQ7/b6ea30937ef5edf6ecbf0c354fbe0e91.jpg",
  "https://i.postimg.cc/hPzPy549/bb39e9d1152664e291310980b0322e0c.jpg",
  "https://i.postimg.cc/Kcs852b2/d841cc692951c410d90c9a9c2328239a.jpg",
  "https://i.postimg.cc/02M2WB5S/eb6df92d5799a1a1ff3ecd85fa60e159.jpg",
  "https://i.postimg.cc/tRm4zjbQ/f01f78232da37b97fcd4ead539138a5b.jpg",
  "https://i.postimg.cc/sf0gJrzs/fd3c68043d6bbf478583c8344d1c8b28.jpg",
  "https://i.postimg.cc/Y2yCxH7v/fe422a088f9ac448beaeab3f8a0c2ddf.jpg",
  "https://i.postimg.cc/kX6X1pMb/ff85c6865b319f128ec0c40cbc4300f2.jpg",
  "https://i.postimg.cc/vHgHqN83/img-1714906075519a5f0be1a4978f571777070bfcc98a496e385b6d1383f90d4d6dea8e2ae344c9e.jpg"
]

export function useDatingAvatar() {
  const { playerProfile } = useDatingPlayer()

  const getStableAvatar = (nameStr) => {
    const customStr = playerProfile.value.settings?.avatarUrls || ''
    const customUrls = customStr.split('\n').map(u => u.trim()).filter(Boolean)
    const pool = customUrls.length > 0 ? [...customUrls, ...builtinAvatars] : builtinAvatars
    if (!nameStr) return pool[0]
    const hash = nameStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return pool[hash % pool.length]
  }

  return {
    getStableAvatar
  }
}
