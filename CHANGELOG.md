# [0.18.0](https://github.com/unishare-oss/unishare/compare/v0.17.0...v0.18.0) (2026-04-19)

### Bug Fixes

- **dto:** add response class, prompt-injection guard, and maxLength consistency ([87f92ce](https://github.com/unishare-oss/unishare/commit/87f92cee2a42ea3dfcc8c569cc1bb4b5c31d94ca))
- **posts:** findFirst for soft-delete filter, per-user throttle guard, typed ApiOkResponse ([6e96da1](https://github.com/unishare-oss/unishare/commit/6e96da1af55d430a5d4d49a9a2886c042d6b3713))
- **web:** fix stale closure in usePostAiChat with ref-based message tracking ([f061cda](https://github.com/unishare-oss/unishare/commit/f061cdad974c4b804c3a1b2cbc327e38f88032ba))

### Features

- add AI chat endpoint with per-user rate limiting on posts ([2824f72](https://github.com/unishare-oss/unishare/commit/2824f723ab2956c4bdc38f6d22ea6f1862ab073e))
- add AI chat panel to post detail page ([1e0ea42](https://github.com/unishare-oss/unishare/commit/1e0ea42310ef81a383a24acdf2657eb35043a690))
- install and register @nestjs/throttler ([1f2257b](https://github.com/unishare-oss/unishare/commit/1f2257bae933f5146a4c2dd7f459ae43fdab7f3f))

### Performance Improvements

- **api:** cache extracted file text and use Redis-backed throttler storage ([66b0cc4](https://github.com/unishare-oss/unishare/commit/66b0cc403e268a6f72130d8cc15cea54f6ab659d))

# [0.17.0](https://github.com/unishare-oss/unishare/compare/v0.16.0...v0.17.0) (2026-04-19)

### Features

- **notifications:** add chat message notification support ([d317c95](https://github.com/unishare-oss/unishare/commit/d317c9567ee3bd50669affd79556698819a69d4c))
- **web/notifications:** handle CHAT_MESSAGE type and route to chat room ([77a224c](https://github.com/unishare-oss/unishare/commit/77a224c49e5dd9e4b695cb41022bca0c9c8b5757))

# [0.16.0](https://github.com/unishare-oss/unishare/compare/v0.15.0...v0.16.0) (2026-04-13)

### Features

- **chat:** add seen-by popover for group messages and unify delivery status logic ([3626e39](https://github.com/unishare-oss/unishare/commit/3626e39bf4197f287cef4053c31a04217008c3ea))

# [0.15.0](https://github.com/unishare-oss/unishare/compare/v0.14.0...v0.15.0) (2026-04-12)

### Bug Fixes

- **chat:** remove unused roomId destructure in chat gateway ([061e919](https://github.com/unishare-oss/unishare/commit/061e91979050dee192e2990b5e6bc3be56455a8b))

### Features

- **chat:** add group photo avatar picker to GroupChatDialog ([faad13f](https://github.com/unishare-oss/unishare/commit/faad13fb940f9f38560192c7793531bc35e5cd83))
- **chat:** add invite members endpoint for group rooms ([78dfb4d](https://github.com/unishare-oss/unishare/commit/78dfb4d4329270b56f765491cf49abccc04ab040))
- **chat:** add Zod + RHF validation to GroupChatDialog, extract UserRow/SelectedBadge ([99654c1](https://github.com/unishare-oss/unishare/commit/99654c15de6d08666ea062b140fe3003d17877fa))
- **chat:** enforce max 30 char limit on group name in CreateRoomDto ([e01a6c9](https://github.com/unishare-oss/unishare/commit/e01a6c9a92b0ba938db58977534a21136ceb4669))
- **chat:** fix sidebar name truncation and simplify message preview ([bc9fe49](https://github.com/unishare-oss/unishare/commit/bc9fe492845d58e93bc36e3b16168f8e1313bd70))
- **chat:** group photo upload with presigned URL and S3 cleanup ([5fba2c7](https://github.com/unishare-oss/unishare/commit/5fba2c78693a7eae5ac39d95bb2fa8ed2a529ce5))
- **chat:** invite members UI — rename and extend GroupChatDialog ([6c0eccc](https://github.com/unishare-oss/unishare/commit/6c0eccc5114a1758f6fe36d3c628b31e90c9b298))
- **chat:** system messages for join/leave events ([f36fb8d](https://github.com/unishare-oss/unishare/commit/f36fb8d04bca1f22b55d0149330509d96278f359))
- **contexts:** remove duplicate socket ([3774ac3](https://github.com/unishare-oss/unishare/commit/3774ac3dcfe8e1038673005bdf1f23f619e3524a))

# [0.14.0](https://github.com/unishare-oss/unishare/compare/v0.13.0...v0.14.0) (2026-04-11)

### Bug Fixes

- **chat:** replace setState-in-effect with key-based remount for dialog reset ([a383998](https://github.com/unishare-oss/unishare/commit/a383998bbb37ab0a834c1465dcc53f6957f3f679))

### Features

- **chat:** add group chat support and create group dialog ([984dec6](https://github.com/unishare-oss/unishare/commit/984dec6088779066208619d4e721f30664d17927))
- **chat:** add leave room endpoint with auto-delete when last member ([42cfa6b](https://github.com/unishare-oss/unishare/commit/42cfa6b6c7b6194869623d1e9139b5ab3bbb4fb6))
- **chat:** emit room-read socket event after markAsRead ([54121b7](https://github.com/unishare-oss/unishare/commit/54121b7b95e0f41f91414b371096a2340149bac1))
- **chat:** group chat UI — header, create dialog, conversation start ([9630575](https://github.com/unishare-oss/unishare/commit/9630575223c9de9dbe9632826774dbd24c04e644))
- **chat:** implement seen-by using participant lastReadAt ([7f4b166](https://github.com/unishare-oss/unishare/commit/7f4b1664656e69b2626c9471ebd89527506f20c5))
- **chat:** leave group UI with loading spinner in confirm dialog ([33dc28e](https://github.com/unishare-oss/unishare/commit/33dc28ef7073e81d1fc78f1086ce4c10c890c127))
- **chat:** show new group rooms in sidebar network section ([cab898a](https://github.com/unishare-oss/unishare/commit/cab898acbc551bb9d3362ead3dffe1d5420a7e59))

### Performance Improvements

- **chat:** guard markRoomAsRead to only fire on unseen messages ([5eb9427](https://github.com/unishare-oss/unishare/commit/5eb9427ea594e0044caf9c6c22e34ac007242942))

# [0.13.0](https://github.com/unishare-oss/unishare/compare/v0.12.0...v0.13.0) (2026-04-10)

### Bug Fixes

- **chat:** only show unread divider for received messages, not sent ([9b62790](https://github.com/unishare-oss/unishare/commit/9b627907de677d9de882890a210444083dcd4e2d))
- **chat:** scroll to bottom when typing indicator appears ([edb8e1f](https://github.com/unishare-oss/unishare/commit/edb8e1fefcf6101a9250dca9bef6083221d748e3))
- **chat:** use theme-aware Tailwind classes in typing indicator bubble ([cad8828](https://github.com/unishare-oss/unishare/commit/cad882881b2310f31a2fd42769d040e567857d0a))

### Features

- **chat:** add Redis-backed presence tracking for active/offline status ([fb5d9a9](https://github.com/unishare-oss/unishare/commit/fb5d9a978a64b019d3bab09c16aa67c9e224f8b3))
- **chat:** wire presence into frontend sidebar and chat header ([2883c3c](https://github.com/unishare-oss/unishare/commit/2883c3c7e5b2987d2c4e3a2e363ddb23ba5a0363))

# [0.12.0](https://github.com/unishare-oss/unishare/compare/v0.11.0...v0.12.0) (2026-04-09)

### Bug Fixes

- add multer as direct dependency for memoryStorage import ([7727c80](https://github.com/unishare-oss/unishare/commit/7727c80a8670ffe470c739da5b3526c86346ba99))
- **api:** exclude prisma.config.ts from build to fix TS6059 error ([bdac155](https://github.com/unishare-oss/unishare/commit/bdac1558ca9fa0477ddf9f55ffcab088bbaffdb2))
- **chat-sidebar:** remove unused user variable from useAuth & update file name ([c7765e0](https://github.com/unishare-oss/unishare/commit/c7765e0abab62ca83c495ffcc946b89c74ca01e9))
- **chat:** delay highlight until scroll animation completes ([eaae471](https://github.com/unishare-oss/unishare/commit/eaae4716c61e4e3818c7ab18f72fbd7403fc8bb9))
- **chat:** fix linter error ([568b944](https://github.com/unishare-oss/unishare/commit/568b94472e8865df20d10d1ee8ad35cc80e8713d))
- **chat:** fix message overflow on mobile — constrain bubbles and scale images ([ab0b3c6](https://github.com/unishare-oss/unishare/commit/ab0b3c67ddc523b9160806f68569e8f7f71fe038))
- **chat:** fix socket msg error ([c7d805f](https://github.com/unishare-oss/unishare/commit/c7d805fc04efd04687b8e14a734ae83ededa724e))
- **chat:** override Radix ScrollArea display:table in DetailPane ([69cbf40](https://github.com/unishare-oss/unishare/commit/69cbf40e1af208b981f0d05e303d4abe15b9e93c))
- **chat:** paperclip hover uses primary color ([573eea5](https://github.com/unishare-oss/unishare/commit/573eea583c946e43a310f857924e436f1f9cbd7f))
- **chat:** prevent sidebar flicker when deleting messages ([fed9fed](https://github.com/unishare-oss/unishare/commit/fed9fedbd94965b309436d726ac2b366070768c9))
- **chat:** prevent text overflow in message bubbles ([d10aa5f](https://github.com/unishare-oss/unishare/commit/d10aa5f12eb80371afaf8e6cb92698c123d2e3e4))
- **chat:** remove timestamp overlay from file bubble ([0a4420f](https://github.com/unishare-oss/unishare/commit/0a4420f472ae86bf9d8228a231f9854ad29b8021))
- **chat:** reuse SidebarTypingIndicator in scroll FAB ([cfbc559](https://github.com/unishare-oss/unishare/commit/cfbc5599909f8e3eff40bb1cddb9fffff402bfcf))
- **chat:** truncate long file names in sidebar (add w-full to button) ([c1991bf](https://github.com/unishare-oss/unishare/commit/c1991bff5545a88c21e8054af85252de874f4c4c))
- **chat:** truncate long reply quotes at 80 chars ([9fb10c7](https://github.com/unishare-oss/unishare/commit/9fb10c734d318120d7b0f8c2ffe450e0dd842031))
- **chat:** update other user message bubble background ([c38ddd3](https://github.com/unishare-oss/unishare/commit/c38ddd3438641ff837a690c233bdd4e8f903a2ec))
- **chat:** use portal-based lightbox in info pane ([786ba73](https://github.com/unishare-oss/unishare/commit/786ba7338c852e58e2cb83ebed0c540c585ec7f0))
- **chat:** use setTimeout for state updates to ensure proper rendering after DOM changes ([2de5bf2](https://github.com/unishare-oss/unishare/commit/2de5bf2dc098842a27c9f7c36c676f8c1340e4bc))
- **chat:** use theme-adaptive background for message bubbles ([0238f09](https://github.com/unishare-oss/unishare/commit/0238f093684b6c9a92b824b8480a0b2e214b0e50))
- fetch single university by id instead of full list in sidebar ([9b12ffc](https://github.com/unishare-oss/unishare/commit/9b12ffc57dda7e0336bbe00e80bcec50a93a6164))
- **hook:** fix edit optimistic ui ([c7b7da3](https://github.com/unishare-oss/unishare/commit/c7b7da3d36b779e492e3ed133adf54ab24a75412))
- **hooks:** fix scroll reset hook bug ([dc858b5](https://github.com/unishare-oss/unishare/commit/dc858b5506e00f98a7444a860eb66b132543786f))
- **layout:** stabilize sidebar margins and fix timestamp overflow on font scale ([c12b9eb](https://github.com/unishare-oss/unishare/commit/c12b9ebacaffa3d7c39631eac4fdc63776a1d7c2))
- mark universityId as required: false on client to allow optional signup ([f452e5e](https://github.com/unishare-oss/unishare/commit/f452e5edd4af65f9df7a8e339862d9ccc7593464))
- move consentGivenAt to server-side only via databaseHooks ([250d590](https://github.com/unishare-oss/unishare/commit/250d5909f7e114fdb2737a09b42c496bc288fee4))
- omit universityId from signup payload when not selected ([2637569](https://github.com/unishare-oss/unishare/commit/26375697de13fd7aea34f45e4f67225acdb80671))
- quiz file upload, multer dep, and quizzes tab styling ([2803c6c](https://github.com/unishare-oss/unishare/commit/2803c6c3f8d175d18b76cefa63246c14786dd422))
- throw NotFoundException in universities findById and add ApiNotFoundResponse ([513b493](https://github.com/unishare-oss/unishare/commit/513b4938c514a78a48eb2e3a9835b666f13028b0))
- use memoryStorage for file uploads so buffer is populated ([92fa2c2](https://github.com/unishare-oss/unishare/commit/92fa2c23968d3ae3f5b37c7eed3ea0efb4f215bc))
- **web:** add fontSize to SettingsStore interface ([32815f6](https://github.com/unishare-oss/unishare/commit/32815f6ae0be78064a326b3eb8cbb4e04ce47a56))

### Features

- add university branding with school logo in sidebar ([b9a97ab](https://github.com/unishare-oss/unishare/commit/b9a97ab64b9c24bd038079ed743f28e667c7f8f1))
- **chat:** add ChatMemberGuard and update socket error handling ([78efc7a](https://github.com/unishare-oss/unishare/commit/78efc7a86e149120617b9d537a4184532bc36807))
- **chat:** add date separators between messages ([af4bc9c](https://github.com/unishare-oss/unishare/commit/af4bc9c28a1cb30e198bfd7fed0620f0b24fb804))
- **chat:** add message reply functionality ([322fdb2](https://github.com/unishare-oss/unishare/commit/322fdb21252dfe8b91e93b45342b317a25afa885))
- **chat:** add optimistic UI updates for sidebar on message edit and delete ([76f1b1e](https://github.com/unishare-oss/unishare/commit/76f1b1e46925040def325466cf8c61d2a8c9f8bb))
- **chat:** auto-focus input on edit and replace confirm with custom dialog ([354b09f](https://github.com/unishare-oss/unishare/commit/354b09fcffa9b5d58247211f06d97c31ae0f0be3))
- **chat:** delete S3 assets on message delete ([377ea13](https://github.com/unishare-oss/unishare/commit/377ea13160fc0cd48bca02533df83a1809f2bbd9))
- **chat:** elongate scroll-to-bottom button when showing typing dots ([3de89cc](https://github.com/unishare-oss/unishare/commit/3de89cc5b4c53cd4d0b5039b87e7e44333cdc495))
- **chat:** file sending with Paperclip button (100MB limit) ([0c77dc8](https://github.com/unishare-oss/unishare/commit/0c77dc8033fd3ba080d192f5fdf4076e2c67138d))
- **chat:** framer-motion ring highlight + typing FAB dots ([0b51f1d](https://github.com/unishare-oss/unishare/commit/0b51f1d9e429e1b7896ff672a4fa7f684d1a122a))
- **chat:** handle soft delete on frontend with parent reference updates ([6b5c6b7](https://github.com/unishare-oss/unishare/commit/6b5c6b7866d2d317f39b0ef67837391036ea1afe))
- **chat:** image lightbox portal + edit caption support ([c2f8e1b](https://github.com/unishare-oss/unishare/commit/c2f8e1b8b80eb52225979d48ab1fbd0f314cc953))
- **chat:** image sending via paste, drag-drop, file picker with caption modal ([5350680](https://github.com/unishare-oss/unishare/commit/53506806a1d88519e90f3efd67281b8e27bf50bc))
- **chat:** implement edit and delete message functionality in backend ([4f6b008](https://github.com/unishare-oss/unishare/commit/4f6b008d04f22c5e43c46d15fbc08129a4699bb5))
- **chat:** implement layered reply bubble stacking and reply button ([a51011e](https://github.com/unishare-oss/unishare/commit/a51011e9a586c54db5a11b308c2e98e97f259f85))
- **chat:** implement message edit and delete in frontend with optimistic UI ([6289956](https://github.com/unishare-oss/unishare/commit/62899564e086461767659e3b59a645d74ad81bcb))
- **chat:** implement soft delete for messages ([6d0751a](https://github.com/unishare-oss/unishare/commit/6d0751acfb68a8d5f34410411a693193a4cf21f7))
- **chat:** last-seen position, unread divider, send auto-scroll ([7475944](https://github.com/unishare-oss/unishare/commit/74759442a285b623512d71679bb989ad39df334f))
- **chat:** make edited indicator symmetrical ([7d930e2](https://github.com/unishare-oss/unishare/commit/7d930e27e8d88f6f697416b79044417e078d263f))
- **chat:** migrate hardcoded px font sizes to rem for font-scale support ([378cb3a](https://github.com/unishare-oss/unishare/commit/378cb3a4f009d8f36ac147d497089c3eceffe638))
- **chat:** overhaul message reply effect ([f45fa27](https://github.com/unishare-oss/unishare/commit/f45fa2794c03e98b5029f81abace984400caa0f7))
- **chat:** personalized reply labels and dynamic bubble widths ([b6baa12](https://github.com/unishare-oss/unishare/commit/b6baa127347285b2b4334d27d8908170d0bebe57))
- **chat:** replace 📷 emoji with ImageIcon in reply/edit context bar ([7ced58b](https://github.com/unishare-oss/unishare/commit/7ced58b9ea3fadd8ec2eefcc993c65ea6d21aaaa))
- **chat:** show expired files with strikethrough in info pane ([7095f94](https://github.com/unishare-oss/unishare/commit/7095f94d20b3b1cf9c7d4a24bcab1ba4395d2c5f))
- **chat:** soft delete messages - disappear from timeline, show 'Message deleted' in reply quotes ([d415ea4](https://github.com/unishare-oss/unishare/commit/d415ea464b05ca3fcf727b587736974ba774a05e))
- **chat:** soft delete messages - disappear from timeline, show 'Message deleted' in reply quotes ([398f9f1](https://github.com/unishare-oss/unishare/commit/398f9f14162814973ce06f2386d0d2375feff723))
- **chat:** style file bubble flush like image+caption pattern ([403624e](https://github.com/unishare-oss/unishare/commit/403624ed3daab292d853fe5c942545efcbd242ca))
- **chat:** telegram-style delete animation with framer-motion ([6512db3](https://github.com/unishare-oss/unishare/commit/6512db34e5423b3515b2211cc678afd69cce31bf))
- **chat:** timestamp outside bubble on hover, edited always visible ([d028ae4](https://github.com/unishare-oss/unishare/commit/d028ae47d215e7161b6fc8cc3825c81eae3803bf))
- **prisma:** implement soft delete in schema ([ecaa406](https://github.com/unishare-oss/unishare/commit/ecaa406c6aa8b2bf9f0a1cf714fb0c7baaefcad6))

# [0.11.0](https://github.com/unishare-oss/unishare/compare/v0.10.0...v0.11.0) (2026-04-07)

### Bug Fixes

- **users:** address PR [#38](https://github.com/unishare-oss/unishare/issues/38) review comments ([ff2ff34](https://github.com/unishare-oss/unishare/commit/ff2ff348a0585e29f298b44c551df1ce98a6cf16))

### Features

- **auth:** protect last auth method unlink + allow different email linking ([cd5f6e8](https://github.com/unishare-oss/unishare/commit/cd5f6e867b8b07e6c09c6e4309315adaaa9f5898))

# [0.10.0](https://github.com/unishare-oss/unishare/compare/v0.9.2...v0.10.0) (2026-04-05)

### Bug Fixes

- fetch single university by id instead of full list in sidebar ([9480558](https://github.com/unishare-oss/unishare/commit/9480558f0ec87db582d46f145ce6a0646405af21))
- mark universityId as required: false on client to allow optional signup ([3feac43](https://github.com/unishare-oss/unishare/commit/3feac43d8e135d6e55f9f7c1e5a5b901c74e3288))
- move consentGivenAt to server-side only via databaseHooks ([ec3c5a0](https://github.com/unishare-oss/unishare/commit/ec3c5a03c176c889a81671150d73669180645dc2))
- omit universityId from signup payload when not selected ([1ff182b](https://github.com/unishare-oss/unishare/commit/1ff182bd3f6ce721fc9623fda16746426843f422))
- throw NotFoundException in universities findById and add ApiNotFoundResponse ([abebb0d](https://github.com/unishare-oss/unishare/commit/abebb0d4369b86a9c033e3ddd53d4fcda65509ac))

### Features

- add university branding with school logo in sidebar ([909956f](https://github.com/unishare-oss/unishare/commit/909956f305ad2fbdd1596fc1fdcb18ec2832235a))

## [0.9.2](https://github.com/unishare-oss/unishare/compare/v0.9.1...v0.9.2) (2026-04-05)

### Bug Fixes

- add multer as direct dependency for memoryStorage import ([6f61cfc](https://github.com/unishare-oss/unishare/commit/6f61cfc033f0bd03ac33b5d4d992cf53a5ccd82e))
- quiz file upload, multer dep, and quizzes tab styling ([3940541](https://github.com/unishare-oss/unishare/commit/39405418c9ec90c6cf8b03cf8d840a854f76a495))

## [0.9.1](https://github.com/unishare-oss/unishare/compare/v0.9.0...v0.9.1) (2026-04-05)

### Bug Fixes

- use memoryStorage for file uploads so buffer is populated ([a6f3bd6](https://github.com/unishare-oss/unishare/commit/a6f3bd6118eed51e1fd54df493b9d48e6d9174ef))

# [0.9.0](https://github.com/unishare-oss/unishare/compare/v0.8.1...v0.9.0) (2026-04-05)

### Bug Fixes

- load Express.Multer types via tsconfig types field instead of per-file imports ([4b68d77](https://github.com/unishare-oss/unishare/commit/4b68d776dda993c95c4ff50b521001560bfab9f8))
- pin eslint to v9 for eslint-plugin-react compatibility ([4067f7f](https://github.com/unishare-oss/unishare/commit/4067f7fe4da70a740617737ae99e52701bcb8099))
- remove useless isAnonymous initial assignment ([5e4a078](https://github.com/unishare-oss/unishare/commit/5e4a0787e4b16f2b4a2901646720bb98283f989a))
- resolve LCP image warnings and TypeScript 6 build errors ([0976d25](https://github.com/unishare-oss/unishare/commit/0976d257a835caf3f813a6901f56e9a01e556ec1))
- use Multer['File'] type instead of unused Express.Multer.File ([7466c81](https://github.com/unishare-oss/unishare/commit/7466c8141a1a60c24cb5e6190cbc185632b01b18))

### Features

- **chat:** improve message preview truncation in sidebar ([a857ca6](https://github.com/unishare-oss/unishare/commit/a857ca6f709c4713577cd6fba38a69ae0d3835ee))
- **profile:** fix user account deletion ([de267c2](https://github.com/unishare-oss/unishare/commit/de267c28fb0e9483ef9204279f23e860f80c7eb1))
- **profile:** implement dialog useState for tracking error msg ([c268f8d](https://github.com/unishare-oss/unishare/commit/c268f8d444edaa479cc034cecc254d6e4bf4e80b))

## [0.8.1](https://github.com/unishare-oss/unishare/compare/v0.8.0...v0.8.1) (2026-04-05)

### Bug Fixes

- load Express.Multer types via tsconfig types field instead of per-file imports ([372ca13](https://github.com/unishare-oss/unishare/commit/372ca13db0c0a5eee5741f2711fe0f267b3e4904))
- pin eslint to v9 for eslint-plugin-react compatibility ([6aa6cf7](https://github.com/unishare-oss/unishare/commit/6aa6cf79f787511e9ef95cf4f3fb03eead0ea0b7))
- remove useless isAnonymous initial assignment ([6cc0e3b](https://github.com/unishare-oss/unishare/commit/6cc0e3b36b548e74fc0e308729fc3a8a2c19542b))
- resolve LCP image warnings and TypeScript 6 build errors ([553f6ec](https://github.com/unishare-oss/unishare/commit/553f6ec4d11545d23bea4acbd3b66c508a8f301a))
- use Multer['File'] type instead of unused Express.Multer.File ([e142f04](https://github.com/unishare-oss/unishare/commit/e142f04f7474abd791ff17544a607fec4a8d94ec))

# [0.8.0](https://github.com/unishare-oss/unishare/compare/v0.7.0...v0.8.0) (2026-04-05)

### Features

- **canvas:** add excalidraw library support with zustand persistence ([b4bce5b](https://github.com/unishare-oss/unishare/commit/b4bce5b3918a425f090194c5712ac8ae6d457d74))

# [0.7.0](https://github.com/unishare-oss/unishare/compare/v0.6.3...v0.7.0) (2026-04-05)

### Bug Fixes

- clear feed store department filter when user updates department ([223336f](https://github.com/unishare-oss/unishare/commit/223336f00a7b286e6a162d6ee7adf0c3f3b6c472))
- consent validation + remove past papers references ([e1d28ab](https://github.com/unishare-oss/unishare/commit/e1d28ab14c57aea22bef8d306729d5da072aab23))
- correct export fetch URL to use Next.js proxy ([efe60d3](https://github.com/unishare-oss/unishare/commit/efe60d39845cbd95535b52a27b6ac0c682253943))
- emit typing indicator on every keystroke instead of once ([93de19d](https://github.com/unishare-oss/unishare/commit/93de19d04d81d2a8ffbdc261e87230dfeb42061c))
- external link removal, description newlines ([adfcfe4](https://github.com/unishare-oss/unishare/commit/adfcfe42d10d36bc52a8fb9748231ce086840141))
- **feed:** exclude hidden dept filter from activeFilterCount ([c677f32](https://github.com/unishare-oss/unishare/commit/c677f327e14c08e9928fc69f54fe4c8ebef1645d))
- make chat sidebar scrollable on desktop ([4633b9b](https://github.com/unishare-oss/unishare/commit/4633b9b2136ffd2dbf66844195dac195f145bc85))
- optimistic collection toggle and consistent DELETE responses ([bb581f7](https://github.com/unishare-oss/unishare/commit/bb581f7cf2657274744f7ef4b7364e5f1b58ff81))
- prevent duplicate room creation by checking local cache first ([9d42aaa](https://github.com/unishare-oss/unishare/commit/9d42aaaaa12262fcea81925d2afc82cd71a5c855))
- register TrendingScheduler and run on startup ([374be7d](https://github.com/unishare-oss/unishare/commit/374be7d8d441c1fbd42e11726bb699648ccc92be))
- remove bottom padding from chat window ([fa9ada0](https://github.com/unishare-oss/unishare/commit/fa9ada0045fe957a09c5529a90ea38af3267d83e))
- remove invalid side prop from DrawerContent ([970c406](https://github.com/unishare-oss/unishare/commit/970c406b2b5c1b9b35bf7e3068492ea9d8fa301c))
- resolve React ref linter error in chat room page ([32e6c7f](https://github.com/unishare-oss/unishare/commit/32e6c7f18fa65bb8756ea3c531de4b26f74cbfb8))
- restore searchVector trigger and include course code in FTS ([5e86b72](https://github.com/unishare-oss/unishare/commit/5e86b7285ffe916bc34333f8a71b71a1a8fc4e60))
- **unified-chat-window:** simplify disconnected banner logic to fix build ([1040555](https://github.com/unishare-oss/unishare/commit/1040555ad5a62ec8606da62655ecaf65c6ef7329))
- update indicator status scroll ([f60f5aa](https://github.com/unishare-oss/unishare/commit/f60f5aa42e1a2d14f1561682496ebd1591d421fe))
- use full user profile object instead of session user ([0be5218](https://github.com/unishare-oss/unishare/commit/0be52183882b9c86e5882e692eee815fdd5980d1))
- **web:** improve mobile chat UI and info pane animations ([0a33a88](https://github.com/unishare-oss/unishare/commit/0a33a889e23224850bd8af7812ebeb19733eab4c))
- **web:** specify page as infinite query param for admin reports endpoint ([07ee59b](https://github.com/unishare-oss/unishare/commit/07ee59b3f058d7bfc6591be91a513df4b78ec735))
- **web:** switch global infinite query param from cursor to page ([12c2ac5](https://github.com/unishare-oss/unishare/commit/12c2ac5f76673fed6877c86ad41609cf2dedd4dd))

### Features

- add collection picker to bookmark button ([96f9017](https://github.com/unishare-oss/unishare/commit/96f9017697b553b530f172e7efdeb3953b37945c))
- add feedback button to mobile More sheet ([98e6b54](https://github.com/unishare-oss/unishare/commit/98e6b549f776af1786818fab87d501a2d0799e71))
- add PDPA compliance (consent, data export, privacy policy) ([499e485](https://github.com/unishare-oss/unishare/commit/499e485650ea0dc9369dc53ebca5c3af27b87e72))
- add typing indicator WebSocket handler ([228342f](https://github.com/unishare-oss/unishare/commit/228342f78bbf51d2750e3562a389a2b9fbb69075))
- **api:** split DM and Group creation endpoints ([a7e2fbf](https://github.com/unishare-oss/unishare/commit/a7e2fbf23c3809a6cb36a3c59a212cf28778f531))
- assignment disclaimer + shorten consent label ([689abc2](https://github.com/unishare-oss/unishare/commit/689abc28a3e79435558b0ca77848ab0cf70b1b8b))
- **chat:** add socket debugging and fix socket prop passing ([67e7154](https://github.com/unishare-oss/unishare/commit/67e7154182df255c94443399e30b10dccb52895d))
- **chat:** auto-scroll to bottom on initial load ([7997979](https://github.com/unishare-oss/unishare/commit/79979792f64d446d1e3c0f53a273bbc5fabb640b))
- **chat:** improve real-time messaging and sidebar updates ([c58cab7](https://github.com/unishare-oss/unishare/commit/c58cab79cec31cdd9fbcbc82f68ef7eb66f05029))
- **chat:** remove group dto ([f9def6b](https://github.com/unishare-oss/unishare/commit/f9def6bd0e6c0893d036e9b44b2262e1971eafd9))
- feedback and bug report system ([98bd3d4](https://github.com/unishare-oss/unishare/commit/98bd3d4739ea7fe5a7bf234cffb27f208d804730))
- hide filter options when trending is selected ([5c3eb89](https://github.com/unishare-oss/unishare/commit/5c3eb8994aa0eaecdaecfe1f4b08287244c92f11))
- hide mobile nav bar when inside a chat room ([4d4e79e](https://github.com/unishare-oss/unishare/commit/4d4e79e06d034b68a96aff8480e0481ff792c461))
- **hook:** comment out optimistic msg update ([f54332b](https://github.com/unishare-oss/unishare/commit/f54332b800af5ed3704bfded79a900f0eaee6604))
- integrate typing indicator with proper types ([8c3f4e6](https://github.com/unishare-oss/unishare/commit/8c3f4e6667d78a3c0be0461492e4f2647b671c5e))
- invalidate sidebar on new message notification ([72a3943](https://github.com/unishare-oss/unishare/commit/72a3943c7ff321d319e3afcc738d3f60326eda76))
- remove past exams filter from feed filter strip ([8457a19](https://github.com/unishare-oss/unishare/commit/8457a190a2df9490c0bae18486e8fa5b36c44a3d))
- **web:** update chat to use new DM endpoint with optimistic updates ([0fab12c](https://github.com/unishare-oss/unishare/commit/0fab12c7a91c7b1aa88f3112b9b2efc9903679c4))

## [0.6.3](https://github.com/unishare-oss/unishare/compare/v0.6.2...v0.6.3) (2026-04-04)

### Bug Fixes

- **collab:** add deterministic id tie-breaker to fractional index sort ([#24](https://github.com/unishare-oss/unishare/issues/24)) ([82d264b](https://github.com/unishare-oss/unishare/commit/82d264b5761d988376296615536cb3326da4ff96))

## [0.6.2](https://github.com/unishare-oss/unishare/compare/v0.6.1...v0.6.2) (2026-04-04)

### Bug Fixes

- **collab:** replace yElementOrder Y.Array with fractional index sorting ([1aa8b2d](https://github.com/unishare-oss/unishare/commit/1aa8b2de83ad30f00195998226f0ac6405a45c68))

## [0.6.1](https://github.com/unishare-oss/unishare/compare/v0.6.0...v0.6.1) (2026-04-03)

### Bug Fixes

- **post:** match skeleton and content container width to prevent layout shift ([4ce1fec](https://github.com/unishare-oss/unishare/commit/4ce1fec44d72b4d9efaf98002c07f1474fc3c16b))

# [0.6.0](https://github.com/unishare-oss/unishare/compare/v0.5.0...v0.6.0) (2026-04-03)

### Bug Fixes

- **auth:** allow moderators to moderate comments ([1067db1](https://github.com/unishare-oss/unishare/commit/1067db1cd6511d746a032c36468b85d0759c3789))
- **post-card:** guard against null course on post card ([7ef395e](https://github.com/unishare-oss/unishare/commit/7ef395ef40dbc005c8f65b7dca392fbceebaabfd))
- **quiz:** allow null explanation in results type ([5de1d8c](https://github.com/unishare-oss/unishare/commit/5de1d8c608ade91b2fd5ed1460d8cd14706a0b39))
- **quiz:** correct average score calculation using valid session count ([cf2c502](https://github.com/unishare-oss/unishare/commit/cf2c5024f91a0473a9dd6089fd5088849ff8751d))
- **quiz:** remove setState-in-effect and impure Date.now in useState ([4fcfeff](https://github.com/unishare-oss/unishare/commit/4fcfeff36087ea4c89fc5ea847ffedb6b626b87d))
- **saved:** invalidate saved posts query on unsave ([e12dd85](https://github.com/unishare-oss/unishare/commit/e12dd85ab63e8144d1dba09f4b71094e85f99489))
- **trending:** full PostEntity shape, guard null course/files in post-card ([c4c4e90](https://github.com/unishare-oss/unishare/commit/c4c4e90e8bffb99016665158fefe6bba694e5cfc))
- **trending:** remove double-wrap, return result directly for interceptor ([c7f8f28](https://github.com/unishare-oss/unishare/commit/c7f8f28fb9ac2c41dd1eeaabd71724c773f431c7))

### Features

- **admin:** add From Post source toggle on quiz generation page ([d4770a5](https://github.com/unishare-oss/unishare/commit/d4770a520afd3b52023a1c88f9f9f679413fb079))
- **ai:** extend summary service for quiz generation ([1256b6b](https://github.com/unishare-oss/unishare/commit/1256b6b9dfa593f898b703b5cc7df4cf6e22c27a))
- **api:** add DELETE /quizzes/:id endpoint ([a555298](https://github.com/unishare-oss/unishare/commit/a555298b9733be641ecef214b22beef4aea96b68))
- **api:** add quiz and study material schema models ([2c69954](https://github.com/unishare-oss/unishare/commit/2c699540d7c374e702dfe007b0320187e82c9b91))
- **api:** migration for quiz models ([65575a7](https://github.com/unishare-oss/unishare/commit/65575a724062a46b52b99f68c28c44b1e68e2804))
- **api:** quizzes module with generation, sessions, and listing ([6aa164c](https://github.com/unishare-oss/unishare/commit/6aa164c79c70805a8ea00b46b949ce115008f1f4))
- **api:** register quiz module ([0962e36](https://github.com/unishare-oss/unishare/commit/0962e36692fe646a1a56f4260eeeba602555ec0f))
- **mobile-nav:** swipeable drawer, full admin items, quizzes icon ([d39d1da](https://github.com/unishare-oss/unishare/commit/d39d1dab5e160ba678afb98b9981fc6c0f546893))
- **posts:** add hasSummary filter to post listing ([9c41a9b](https://github.com/unishare-oss/unishare/commit/9c41a9b24f9bb45a316f5b5b05e5c82fa231f7c5))
- **posts:** expand post page width when sidebar is collapsed ([3dbc9c4](https://github.com/unishare-oss/unishare/commit/3dbc9c474920a9819f61a08cfed6d409c7927064))
- **quiz:** add delete button for admins on quiz page ([617cdf4](https://github.com/unishare-oss/unishare/commit/617cdf465f9bcdd9f5b39f3d222191bcc805054a))
- **quiz:** add generate-from-post endpoint using post AI summary ([f96f7f0](https://github.com/unishare-oss/unishare/commit/f96f7f0ccc91374c71ff4c1905a61feb9974f63e))
- **share:** add ShareDialog component & add share func ([40e6fe1](https://github.com/unishare-oss/unishare/commit/40e6fe128d84d0c8396e61fc17f64b940ce84db7))
- **sidebar:** collapsible sidebar with grouped nav and notification placement ([f068597](https://github.com/unishare-oss/unishare/commit/f06859706ce80aeb73816a75fde584c26db76ea8))
- **web:** quiz components and game hook ([e9bb0f1](https://github.com/unishare-oss/unishare/commit/e9bb0f15a2270c19e739ece5aa0a6431b787df91))
- **web:** quiz pages — admin generation, browse, play, and results ([6689155](https://github.com/unishare-oss/unishare/commit/6689155c45930f8878c7abe4640b66a303c944cb))

### Performance Improvements

- **quiz:** O(1) question lookup via Map, atomic createMany+update in transaction ([6c9ebf8](https://github.com/unishare-oss/unishare/commit/6c9ebf8dde7d4b855f4267bbd91c7f821c696de2))

# [0.5.0](https://github.com/unishare-oss/unishare/compare/v0.4.2...v0.5.0) (2026-04-01)

### Bug Fixes

- remove duplicate version heading from release notes ([112e874](https://github.com/unishare-oss/unishare/commit/112e874241b77703b938aeae20e62a11181d701d))
- remove duplicate version headings from changelog page ([7585a9c](https://github.com/unishare-oss/unishare/commit/7585a9c5f75852171e3bd80d8f544f988e829463))

### Features

- add link to GitHub release for each version ([323da18](https://github.com/unishare-oss/unishare/commit/323da18c9545f7be40f6ca71ba7ca9c129867263))

## [0.4.2](https://github.com/unishare-oss/unishare/compare/v0.4.1...v0.4.2) (2026-04-01)

### Bug Fixes

- resolve linting errors in changelog page ([7a567f5](https://github.com/unishare-oss/unishare/commit/7a567f5312e8697afeb7cc8a9efdf85dcf83d0be))

## [0.4.1](https://github.com/unishare-oss/unishare/compare/v0.4.0...v0.4.1) (2026-04-01)

### Bug Fixes

- use useWatch instead of form.watch for React Compiler compatibility ([d91c26c](https://github.com/unishare-oss/unishare/commit/d91c26ccc9c7fccaa2263f991a3c11957ef60f0c))

# [0.4.0](https://github.com/unishare-oss/unishare/compare/v0.3.0...v0.4.0) (2026-04-01)

### Bug Fixes

- **02-01:** fix TypeScript cast in spec for mocked auth api methods ([52ba7d0](https://github.com/unishare-oss/unishare/commit/52ba7d096d2d38605adbf4f58a3459bdad3f3500))
- **03-search-tagging:** resolve linting errors and verify build ([f6653f5](https://github.com/unishare-oss/unishare/commit/f6653f597f70c45e341114977ac4032c9e3ac426))
- **04:** correct better-auth cookie name in gateway middleware and tests ([a4180ee](https://github.com/unishare-oss/unishare/commit/a4180ee005899d479870b469548c84bcc69d9c13))
- **04:** remove dead yElements.observe noop from collab-context ([f801b87](https://github.com/unishare-oss/unishare/commit/f801b8790f5f1d32068b1afa7532fccd590ed4ae))
- **04:** resolve checker blockers in plans 02, 03 and validation ([9c9b599](https://github.com/unishare-oss/unishare/commit/9c9b599b0e99f14e00fbe7a8fb57c02267255c5f))
- **05:** clear presence state on disconnect ([886ae86](https://github.com/unishare-oss/unishare/commit/886ae86a2c79030d642ef561c3f755146d92bbd5))
- **05:** update payload limit ([008e531](https://github.com/unishare-oss/unishare/commit/008e531b9bda75345f175ffb26eedda1003af3b2))
- **06-01:** update gateway specs to use getDoc/resetIdleTimer and mock saveSnapshot/getSnapshot ([8f10f7b](https://github.com/unishare-oss/unishare/commit/8f10f7b70b08425311a6ab51b62d230775fcae9f))
- **06-03:** start at step 0 with pre-filled file instead of jumping to FILES step ([0975169](https://github.com/unishare-oss/unishare/commit/09751699ebcfa4b57d52686cdb0f866d06b37818))
- **07-03:** radio+label in flex-col layout for proper stacking in SettingsPopover ([fe03a1a](https://github.com/unishare-oss/unishare/commit/fe03a1abeddc22c414db893be789d2462a19f03e))
- **08-02:** connecting popup, visibility menu, card polish, modal polish ([ad3d583](https://github.com/unishare-oss/unishare/commit/ad3d58347ebad1ceb9033f15ec8fc31f2585dced))
- **09-01:** add RoomEntity return type to toRoomResponse for TS inference ([0ca22ff](https://github.com/unishare-oss/unishare/commit/0ca22ffc72b7f83259d94f43eb4a9580b11de3f0))
- **09:** revise plans based on checker feedback ([742e9b1](https://github.com/unishare-oss/unishare/commit/742e9b1647e2bce65368943245c8efc90f2d0c17))
- **09:** update createRoom test to expect hasPassword in response shape ([a83bf00](https://github.com/unishare-oss/unishare/commit/a83bf0090ad64f69df3214d214dba6ee77e83d26))
- actually remove externalUrl when cleared in edit post ([da29a16](https://github.com/unishare-oss/unishare/commit/da29a16ef1699fdb84d6530b5daf554849a1e3a9))
- add explicit string type to ChatRoomEntity name and imageUrl ([76fce28](https://github.com/unishare-oss/unishare/commit/76fce28dc1ea2a778b04ff9bb6bed2fed962a4bf))
- add socket error UI feedback in chat ([eb20839](https://github.com/unishare-oss/unishare/commit/eb20839345105c63058b6a76ebdacd5485af6450))
- **ai-summary.service.ts:** update bullet point guidelines and increase LLM call limit ([6068ac9](https://github.com/unishare-oss/unishare/commit/6068ac91ab82c986eb171e8733c591e87ea60478))
- **ai-summary.service.ts:** update bullet point guidelines and increase LLM call limit ([6a1391f](https://github.com/unishare-oss/unishare/commit/6a1391fcb3cc53aea293eaff5df9af8c008e1858))
- allow empty externalUrl when editing a post ([6310bf4](https://github.com/unishare-oss/unishare/commit/6310bf433b1b85f62215dc04089478561e6d96d1))
- allow null externalUrl in posts repository type ([c426165](https://github.com/unishare-oss/unishare/commit/c426165723562beb62788677000de6fcd78aa30b))
- **api:** disable helmet CSP on API server ([55c6c4e](https://github.com/unishare-oss/unishare/commit/55c6c4eea6c3bd78a03b004445512301fff71cf8))
- **auth,collab:** fix WebSocket auth for cross-subdomain production setup ([d760436](https://github.com/unishare-oss/unishare/commit/d760436d862f4c1867d8ade4704ef75efcc955a4))
- **canvas:** correct sign-in route on private board gate to /login ([b15f542](https://github.com/unishare-oss/unishare/commit/b15f5429b9adcfde5e7f83720ddc87f03d03807d))
- **canvas:** memo ExcalidrawWrapper, fix unchanged guard, stable props ([66e0c00](https://github.com/unishare-oss/unishare/commit/66e0c007aad8409f295b13ff874cac33f5272bce))
- **canvas:** skip Yjs writes when elements unchanged ([887d07e](https://github.com/unishare-oss/unishare/commit/887d07e9e493c5b8f76d102c42dc176727602afc))
- **chat:** fix optimistic ui update for room ([f7e0723](https://github.com/unishare-oss/unishare/commit/f7e0723a5a09941924b55fef198785885b9a5c50))
- check chunk PUT response status and drop Content-Type from multipart parts ([d1f7b83](https://github.com/unishare-oss/unishare/commit/d1f7b83d690377cf0b79a487679e871ae29e9b98))
- **collab,docker:** fix NEXT_PUBLIC_API_URL baked into web image at build time ([32c5f92](https://github.com/unishare-oss/unishare/commit/32c5f92b7443aed42e7e8cca35626e96ba660f8f))
- **collab.gateway.ts:** update session token cookie name to match backend changes ([48334ca](https://github.com/unishare-oss/unishare/commit/48334ca2abc0f5ab54740bdb9bcecb77079c5470))
- **collab:** fix multi-user canvas sync via Y.Map + relay buffering ([47e160d](https://github.com/unishare-oss/unishare/commit/47e160d5c0888c4549be0c798eae279ed7375bfe))
- **collab:** invalidate room query after visibility update so radio reflects new state ([e286bf4](https://github.com/unishare-oss/unishare/commit/e286bf4594a8a17f230d33f33a1a9f27ef82b46e))
- **collab:** replace useRef with useState for ydoc/yElements to avoid render-time ref access ([4613038](https://github.com/unishare-oss/unishare/commit/46130380bd3010bc0e852cfbc57198fa3e7613e9))
- **collab:** resolve anon session on join via cookie instead of missing Bearer token ([65fe1f7](https://github.com/unishare-oss/unishare/commit/65fe1f74288ec591f7d47ad03f96db3040de0d05))
- **collab:** split context to prevent ExcalidrawWrapper re-renders ([61384de](https://github.com/unishare-oss/unishare/commit/61384dee250a033c6c7c07be7e05c503a1cd2663)), closes [hi#frequency](https://github.com/hi/issues/frequency)
- collect ETags browser-side via R2 CORS instead of ListParts ([5b6ab4b](https://github.com/unishare-oss/unishare/commit/5b6ab4b2290400c552f46bbd7e4cd77d17e014f2))
- consent validation + remove past papers references ([313f77b](https://github.com/unishare-oss/unishare/commit/313f77b41108d899938b962ee9c5fc1f997b377c))
- correct export fetch URL to use Next.js proxy ([2331e44](https://github.com/unishare-oss/unishare/commit/2331e44e473bb5841b39a9c3a1aa9e633e79f5d0))
- do nothing if search not found and user press enter ([2fe148d](https://github.com/unishare-oss/unishare/commit/2fe148de4dd1b4b6481ca406009c73a633f05220))
- do nothing if search not found and user press enter ([e20120c](https://github.com/unishare-oss/unishare/commit/e20120c5ce94a2368240e2d4a2b0214c9bd7df58))
- **docker:** restore API_URL env var for next.config rewrites ([8cb980f](https://github.com/unishare-oss/unishare/commit/8cb980fc23369344827d8e6c0283a7da2e7c0533))
- enable scrolling in sidebar navigation ([2fdc529](https://github.com/unishare-oss/unishare/commit/2fdc529b9dd7c870e4cdcbe797b8221d12296056))
- exclude anonymous users from admin list and stats count ([f90f292](https://github.com/unishare-oss/unishare/commit/f90f292106bf9099261c727ad8d0ec3303b059d9))
- external link removal, description newlines ([207e6df](https://github.com/unishare-oss/unishare/commit/207e6df2bec3a36e2569b1a43bf6d6fa9e058cef))
- extract DropdownFilters to separate file to fix react-hooks/static-components lint error ([89e257a](https://github.com/unishare-oss/unishare/commit/89e257a747a816a91115606a85aa7765d8e168cf))
- **feed:** typing in search clears tag URL param so user can override tag filter ([9584c20](https://github.com/unishare-oss/unishare/commit/9584c20f4fa9104e7146ca86f0551cb43008dc2b))
- **feed:** update openapi spec with moduleNumber filter param ([b751d01](https://github.com/unishare-oss/unishare/commit/b751d0115cb2912716efaa4aaf6af97a3d3b220d))
- **feed:** update URL param instantly on keystroke, debounce only the search API call ([177c0cb](https://github.com/unishare-oss/unishare/commit/177c0cb14a36b177e1541d9634b5de4357191c7d))
- **filter-strip.tsx:** update div class to use sticky positioning ([76f92e0](https://github.com/unishare-oss/unishare/commit/76f92e01fd007b9e5df3419b70e6dc5d5f9cefbc))
- fix lint errors ([eb89ea5](https://github.com/unishare-oss/unishare/commit/eb89ea5b7c331de36b9e09f7c6e68dd743fda989))
- hide regen button once summary is generated ([fc58164](https://github.com/unishare-oss/unishare/commit/fc58164cde25045f8f530be30f9d2cd64eb5e985))
- hide regen button once summary is generated ([ea82d90](https://github.com/unishare-oss/unishare/commit/ea82d90f69358e2908b8ed9580c3ae0f8e26e8a0))
- hide regenerate summary button until header is hovered ([5707a33](https://github.com/unishare-oss/unishare/commit/5707a33f670408146fa13dd9a478450f8a0d39d8))
- highlight Feed nav item on /feed route ([3352139](https://github.com/unishare-oss/unishare/commit/3352139f094b9c25c72da0186b87a2f6bff257bb))
- improve Open Graph meta tags for Facebook link previews ([5ae1acd](https://github.com/unishare-oss/unishare/commit/5ae1acd35967692a97ac32684bc59d68d10e5682))
- improve skeleton visibility with subtle stone color ([69e1f76](https://github.com/unishare-oss/unishare/commit/69e1f766ebb479b6f495931ba3ee9b301eac4b90))
- increase uploadId MaxLength to 1024 for S3 multipart upload IDs ([71c0aca](https://github.com/unishare-oss/unishare/commit/71c0acafbf911f406d4a58feb8350706f360f276))
- invalidate rooms cache after DM creation so sidebar updates ([75d0d55](https://github.com/unishare-oss/unishare/commit/75d0d553d85a8de4fddca36714e34574be6aad88))
- **lint:** remove unused vars and escape apostrophe in report-row ([5237175](https://github.com/unishare-oss/unishare/commit/5237175977bee3438cfd4c6d46a70683f13dd2f9))
- **lint:** resolve all lint errors — Suspense for useSearchParams, no-any types, setState-in-effect ([e01cde2](https://github.com/unishare-oss/unishare/commit/e01cde226070b55002277280154d4fc091e3bf95))
- move AI summary generation to post header, only when no summary exists ([56ace60](https://github.com/unishare-oss/unishare/commit/56ace60e2ab2513ec90c107e4aa96212aa9a51dc))
- move setShowDisconnected(false) to async callback to satisfy lint ([85cc82f](https://github.com/unishare-oss/unishare/commit/85cc82f2352c3f2587aaecdf03bd351aed9497a5))
- only disable send during room creation, not per-message send ([afbf389](https://github.com/unishare-oss/unishare/commit/afbf3895ac0078659e283373a5449c8d92d16245))
- only show disconnected banner after 5s offline ([937f3ab](https://github.com/unishare-oss/unishare/commit/937f3ab37db6fe4e1b22fcb5696fb89cd0c34729))
- optimistic collection toggle and consistent DELETE responses ([9e3e049](https://github.com/unishare-oss/unishare/commit/9e3e0491d9f517ecbe6b25acbb3121156607a902))
- **page.tsx, cursor-overlay.tsx:** address TypeScript eslint warnings ([7598e8d](https://github.com/unishare-oss/unishare/commit/7598e8d7cfa28f480268f6426eb1406aacfa4f70))
- pass APP_URL as build arg for og:image metadataBase ([e9b4ca3](https://github.com/unishare-oss/unishare/commit/e9b4ca38e9ae80d3ca4c59a3d5a9ad4ea904d529))
- **post-card:** stop click propagation on report dialog to prevent Link navigation ([c4a3871](https://github.com/unishare-oss/unishare/commit/c4a387102f636ed95f7bf5b5372b28332104edfe))
- prevent infinite fetch loop with loading gate ([4626a0c](https://github.com/unishare-oss/unishare/commit/4626a0ca459b6dbaee73ed3ad1a7153e8dd1a4a7))
- prevent stale dot drawings in canvas collab ([961190a](https://github.com/unishare-oss/unishare/commit/961190a5a866d28b6597de5e3a64bb6069d05a03))
- **prisma:** correct reconciliation migration SQL for generated column ([bfb65c7](https://github.com/unishare-oss/unishare/commit/bfb65c7295a66a649a38322b6a40cf089f299b62))
- **profile:** truncate long email on mobile with full text on hover ([e01a7c7](https://github.com/unishare-oss/unishare/commit/e01a7c7411cb6081104b6196a07d57317bef2c1a))
- proxy multipart chunks through API to avoid CORS/ETag issues ([ee436fb](https://github.com/unishare-oss/unishare/commit/ee436fb646aeb6caf105d7f4aa63aff0374dc2a2))
- register TrendingScheduler and run on startup ([05ea5e4](https://github.com/unishare-oss/unishare/commit/05ea5e4a273c1232e9e271e35dbe44510c4459f9))
- remove bottom padding from chat window ([ee3ac35](https://github.com/unishare-oss/unishare/commit/ee3ac35f5bc76c2d1dd04ea110b8f8b43202f551))
- remove duplicate file content in upload-post-file.ts ([d805327](https://github.com/unishare-oss/unishare/commit/d805327a279a18321047b18c7f7d8d043de43663))
- remove polling, show static unavailable state for missing summary ([d9f32e5](https://github.com/unishare-oss/unishare/commit/d9f32e58a5bbf4174e7dc26bce76add0b2afdf94))
- remove polling, show static unavailable state for missing summary ([510effb](https://github.com/unishare-oss/unishare/commit/510effbe4a8d8b23594577c22c1badec8b187b2c))
- remove reconnect toast, banner handles reconnect state ([779960b](https://github.com/unishare-oss/unishare/commit/779960b3a9b7b3b19b7f372bf03aac5a3e33c77c))
- replace nested <a> with <button> in RequestCard to fix hydration error ([01ae483](https://github.com/unishare-oss/unishare/commit/01ae48343188ac81838bb928d96fa446b518e043))
- **reports:** soft-delete post on approval and allow moderator access ([2a13a01](https://github.com/unishare-oss/unishare/commit/2a13a016eeb48efde3fb9ce03c4999c3f32b502e))
- **reports:** use UserRole.ADMIN enum instead of lowercase 'admin' string ([07a1a11](https://github.com/unishare-oss/unishare/commit/07a1a11354a87557b1dcad7191016bfe703c8c74))
- resolve critical chat bugs ([7f541b2](https://github.com/unishare-oss/unishare/commit/7f541b2fe2dfcd2afbbac8bebeb49c1c14822dca))
- resolve FollowsService method name and duplicate DTO errors ([5a51201](https://github.com/unishare-oss/unishare/commit/5a51201a14b0d7596e22aa9001c32f1790d0048e))
- resolve lint and build errors in post-summary and lists page ([6787fb3](https://github.com/unishare-oss/unishare/commit/6787fb34c8cc6d97bc6c55eb3bc6e399637331de))
- resolve lint and build errors in post-summary and lists page ([44d8f59](https://github.com/unishare-oss/unishare/commit/44d8f59115ac055e68148a55424f6c8e1b8bec49))
- resolve TagsService dependency injection in PostsModule ([4850db1](https://github.com/unishare-oss/unishare/commit/4850db19ac3258f8124f23878988b2e97d53272c))
- resolve TS error in post layout - template literal is never nullish ([2c0f6e6](https://github.com/unishare-oss/unishare/commit/2c0f6e60e35093ea0a0bd07d83195202f1e6ee8e))
- resolve web build errors from missing Swagger type decorators ([7fa2bad](https://github.com/unishare-oss/unishare/commit/7fa2bad757c9fbd972bc34ba6be4ffb667c5ca5b))
- resolve web build errors from missing Swagger type decorators ([6a1a224](https://github.com/unishare-oss/unishare/commit/6a1a2244db31773fad46f8085a55ab17ba5454e7))
- restore searchVector trigger and include course code in FTS ([f98b147](https://github.com/unishare-oss/unishare/commit/f98b1472946abbdadb6d16987959f6e1cf72d49a))
- revert externalUrl type to string, keep empty-string-to-null in service ([1d3fdcc](https://github.com/unishare-oss/unishare/commit/1d3fdcc145222732532cd4bb17f2505abdf05a78))
- **search-tagging:** address code review findings ([980d8cd](https://github.com/unishare-oss/unishare/commit/980d8cd627f17995b93b6e993a53faff9f0a4bc5))
- **search-tagging:** correct validateTag test examples to match regex spec ([1bef771](https://github.com/unishare-oss/unishare/commit/1bef771fff23b4d1a9e8ecf334371922c3f4098c))
- **search:** avoid tsvector deserialization by fetching IDs then posts; fix tags validation ([6c1a20c](https://github.com/unishare-oss/unishare/commit/6c1a20c144c5c94b4da2ddec92103a658cf6cb4b))
- **search:** guard suggestions?.map against undefined before first fetch resolves ([6acfa5d](https://github.com/unishare-oss/unishare/commit/6acfa5d02372ef39225c91534ad5d07741de73c8))
- **security:** redirect non-owners away from post edit page ([3159408](https://github.com/unishare-oss/unishare/commit/315940800bb659c27f7e44492ce6b5a4b4d21649))
- show other participant's name for DM rooms in sidebar ([eb30629](https://github.com/unishare-oss/unishare/commit/eb3062919e74c68dc4c044b47ef72b1f0d3526d8))
- skip Content-Type header for FormData requests in customFetch ([5799cd2](https://github.com/unishare-oss/unishare/commit/5799cd2347e038471b28190823a988d7ba7d8547))
- summarize all supported files when post has multiple attachments ([a76f5c3](https://github.com/unishare-oss/unishare/commit/a76f5c3cad9ddff7496dde8373d1b723f37f5247))
- summarize all supported files when post has multiple attachments ([ad24271](https://github.com/unishare-oss/unishare/commit/ad24271715c465f66b5e56a1ded5d30970e83e7d))
- **tags:** add error logging to applyTags; commit pending tag on blur in TagInput ([1f1a245](https://github.com/unishare-oss/unishare/commit/1f1a2457dde8b14fe555fea0e469cac49f72a566))
- **tags:** include tags in post responses and update OpenAPI spec ([4dc1604](https://github.com/unishare-oss/unishare/commit/4dc16042b853cef3554fe95b80ae530880929586))
- **tags:** re-fetch post after applyTags so create/update responses include tags ([c4d742e](https://github.com/unishare-oss/unishare/commit/c4d742efe8b3cbd5670310686425f38c5c8bb75f))
- **tags:** replace nested Link with button in post-card to avoid invalid nested anchors ([291f060](https://github.com/unishare-oss/unishare/commit/291f060e5cdb76dceb66ab8dc5773d2667e15653))
- **tags:** show all tags on feed card instead of truncating to 4 ([1009bf5](https://github.com/unishare-oss/unishare/commit/1009bf59cfeca456740a57246735583bf2c1b1f5))
- **tags:** use design tokens in TagInput dropdown and loading state ([206fd2e](https://github.com/unishare-oss/unishare/commit/206fd2e85fc6051b78a26a4ed7bc3ca5f5d94a6e))
- **tasks:** prune anon users by session expiry, not creation date ([a06b6d2](https://github.com/unishare-oss/unishare/commit/a06b6d24d2c1fec9488e89c9f268eeed6fbd7793))
- **unified-chat-window:** simplify disconnected banner logic to fix build ([323ab53](https://github.com/unishare-oss/unishare/commit/323ab5346a7d7d647bdc3a067d29cc6f64894e8f))
- use bg-muted for chat skeletons ([f7a432a](https://github.com/unishare-oss/unishare/commit/f7a432a0bd0f5f7062425f6d4701f401e67215cd))
- use bg-muted for chat skeletons ([803e951](https://github.com/unishare-oss/unishare/commit/803e9512c1418e73f456eeaefeb48c12cdc11829))
- use existing tags in prompt and temperature 0 for consistent ai tagging ([ff969e3](https://github.com/unishare-oss/unishare/commit/ff969e39ae0b2590fc78f200d539dcbf5daa6378))
- use existing tags in prompt and temperature 0 for consistent ai tagging ([41669a2](https://github.com/unishare-oss/unishare/commit/41669a2dcb2942154016c37929fe71288114f625))
- use id as cursor field for message pagination ([2d72cc6](https://github.com/unishare-oss/unishare/commit/2d72cc6fcb84d97250aaee7b06b891d57675ab1a))
- use ListParts to get ETags server-side instead of browser headers ([8212310](https://github.com/unishare-oss/unishare/commit/821231041c53fb37356629267eabac539eeb6adf))
- use server-side APP_URL for metadataBase to resolve og:image correctly ([d20ecf3](https://github.com/unishare-oss/unishare/commit/d20ecf3e0c04a82860479a83d9ef4fa0c00629c9))
- use string type for ListParts PartNumberMarker (AWS SDK v3) ([9ee5ccf](https://github.com/unishare-oss/unishare/commit/9ee5ccf02b492d76ad629a88e50afc6d6b4d0fc0))
- **web:** improve mobile chat UI and info pane animations ([7578a9f](https://github.com/unishare-oss/unishare/commit/7578a9fe1226369965887be5e4561c00edfb0423))
- **web:** specify page as infinite query param for admin reports endpoint ([1dc9388](https://github.com/unishare-oss/unishare/commit/1dc93889d920522e5b19cede56113996fd9cc1cc))
- **web:** switch global infinite query param from cursor to page ([d91aa5a](https://github.com/unishare-oss/unishare/commit/d91aa5ad00076fa5aa62dd462a54a96c7404bdd5))

### Features

- **01-01:** add Room model migration ([4df6a8e](https://github.com/unishare-oss/unishare/commit/4df6a8e190b48f0248d84afff7ec645887217428))
- **01-01:** scaffold CollabModule with room CRUD endpoints ([7ddeb15](https://github.com/unishare-oss/unishare/commit/7ddeb15b091f9776efe8531514ed91bfe11bd0a3))
- **02-01:** add guest identity schema fields, anonymous auth plugin, and display name generator ([5182fe4](https://github.com/unishare-oss/unishare/commit/5182fe4cd276ac13785dc88f8d49a33d9a4e3663))
- **02-01:** implement POST /rooms/:slug/join endpoint with anonymous session creation ([978f695](https://github.com/unishare-oss/unishare/commit/978f695978a8be08afec4e10ed99ed5e2fc8e04c))
- **02-02:** add pruneAnonymousUsers cron to TasksService with unit tests ([6760c5c](https://github.com/unishare-oss/unishare/commit/6760c5c3e9dc1f4f465a8e22e926c412901ac8f2))
- **03-01:** install WebSocket deps, add CollabGateway and CollabRoomService, wire IoAdapter ([27b75e9](https://github.com/unishare-oss/unishare/commit/27b75e933285157f4ea8d6694f4c7993931fbb2a))
- **03-search-tagging:** add search and tagging endpoints to PostsController ([f7f811f](https://github.com/unishare-oss/unishare/commit/f7f811f0d3c7db357d473693f770f4adf90db19c))
- **03-search-tagging:** add Tag and PostTag models with FTS tsvector ([bd7870e](https://github.com/unishare-oss/unishare/commit/bd7870e38c6615a9ba40da7468a81570fb5c9523))
- **03-search-tagging:** create frontend search and tag components ([aadd4aa](https://github.com/unishare-oss/unishare/commit/aadd4aaea89c37fdeef5fa6654c6787a6b6d9e62))
- **03-search-tagging:** create Tags module and register in AppModule ([09d38ac](https://github.com/unishare-oss/unishare/commit/09d38ac2c56ceb49ef837658a84082e8b9d13844))
- **03-search-tagging:** extend Post DTOs to support tags ([7146e83](https://github.com/unishare-oss/unishare/commit/7146e8371058bf9ef4ec7f9cda5f558d650b1996))
- **03-search-tagging:** extend PostsService with search and tagging ([634f301](https://github.com/unishare-oss/unishare/commit/634f301004275fd9a4d290b20b5def34a1501136))
- **03-search-tagging:** implement TagsService with CRUD and autocomplete ([7be1a55](https://github.com/unishare-oss/unishare/commit/7be1a55611f4c25c7401e3ade14adff8addb4d23))
- **04-01:** canvas route shell with join-first flow, header, and dependencies ([4ec1ec7](https://github.com/unishare-oss/unishare/commit/4ec1ec722cd403e32421bb7ee5fa476b618b9329))
- **04-02:** add vitest config and CollabProvider sync logic unit tests ([48fd094](https://github.com/unishare-oss/unishare/commit/48fd094b12d17a534dd4b8a54d710ec2fe511e36))
- **04-02:** create CollabProvider context with socket.io and Yjs wiring ([2a66d0d](https://github.com/unishare-oss/unishare/commit/2a66d0d002ee0d22f81102573aec1618528f6da3))
- **04-03:** wire Excalidraw with two-way Yjs sync into canvas route ([30bd235](https://github.com/unishare-oss/unishare/commit/30bd23567a083142fba464fe57941581b5105b50))
- **04-trending-reporting:** add frontend components, hooks, and E2E tests ([18b568e](https://github.com/unishare-oss/unishare/commit/18b568ef44a47eee0176645fdddb9a479738540e))
- **04-trending-reporting:** add GET /posts/trending endpoint ([18a7a78](https://github.com/unishare-oss/unishare/commit/18a7a7857ae137a2e8f712b582fb893bbb80f85a))
- **04-trending-reporting:** add trending and reporting schema models ([3c149d2](https://github.com/unishare-oss/unishare/commit/3c149d2872c27891082aff2718e47bfc13a723c1))
- **04-trending-reporting:** add trending scheduler for 5-minute refresh ([2c27c34](https://github.com/unishare-oss/unishare/commit/2c27c34b27ac4c99f38d39c16656c92a3cfdd4c2))
- **04-trending-reporting:** apply migration for trending and reporting tables ([774aa3d](https://github.com/unishare-oss/unishare/commit/774aa3df18dc3eefcf3910ce95138316d571b084))
- **04-trending-reporting:** create reports module with service and controllers ([fb5e78d](https://github.com/unishare-oss/unishare/commit/fb5e78d99bf8706ccd3ec74fd16ee17107567336))
- **04-trending-reporting:** create trending service and module ([5443851](https://github.com/unishare-oss/unishare/commit/544385144fc506a58dfe4ef8b69ea3ce2e3677eb))
- **04-trending-reporting:** extend post entity with trending and publication status ([95891fe](https://github.com/unishare-oss/unishare/commit/95891fefc3c695c40a1a0f4d8916f3f21aa51242))
- **05-01:** extend CollabGateway with cursor-move relay and participant events ([90e5cd2](https://github.com/unishare-oss/unishare/commit/90e5cd2bbe289a6ee006920dbe5099fcc3ea4fda))
- **05-01:** extend gateway spec with participant tracking tests ([621e6bf](https://github.com/unishare-oss/unishare/commit/621e6bf21cb3e46d043af1282bbad655dc2c30ac))
- **05-02:** implement PRESENCE_COLORS and hashToColorIndex with TDD ([592c156](https://github.com/unishare-oss/unishare/commit/592c1566ca2b3b13135463ecc73f387c0a8e8318))
- **05-02:** implement sceneToOverlay coordinate conversion with TDD ([8c48db8](https://github.com/unishare-oss/unishare/commit/8c48db820bcd1b442173e97078e47501121f3fc7))
- **05-03:** extend CollabContext with presence state, socket listeners, and throttled cursor emit ([e7a8835](https://github.com/unishare-oss/unishare/commit/e7a8835cd668354e6cc47dec43726785bffa502a))
- **05-04:** add ParticipantAvatars to header and wire CursorOverlay ([cf94abc](https://github.com/unishare-oss/unishare/commit/cf94abcdfc1c0b24a0bbf70ef29cd4d97bffa15f))
- **05-04:** create RemoteCursor and CursorOverlay components ([3e4389d](https://github.com/unishare-oss/unishare/commit/3e4389d68eb23db11214edc273809344ce854be6))
- **05-polish-testing:** add admin role verification to all admin endpoints ([3216d6c](https://github.com/unishare-oss/unishare/commit/3216d6c1b892d5d30b42eb3f51fe9a4881993f2e))
- **05-polish-testing:** add soft-delete filtering helper to PostsService ([77e55fb](https://github.com/unishare-oss/unishare/commit/77e55fb671197b3da033da3d4541db0a1e7506e0))
- **06-01:** add snapshot persistence to CollabRepository and CollabRoomService ([40d3fe5](https://github.com/unishare-oss/unishare/commit/40d3fe52632c06316eae57d556cc66c26d79d92b))
- **06-01:** wire gateway for async getOrCreate, resetIdleTimer, and extend unit tests ([4728870](https://github.com/unishare-oss/unishare/commit/4728870ba9347f0b344d810080c29e91fc9f88fa))
- **06-02:** export dropdown in canvas header with PNG, PDF, and Post to UniShare ([074baed](https://github.com/unishare-oss/unishare/commit/074baed76283d404f403301e7e7a3b79ca70bded))
- **06-02:** race condition fix, isAnonymous plumbing, and export-utils.ts ([18b155e](https://github.com/unishare-oss/unishare/commit/18b155e43896c17c369c166d64643b29033412c3))
- **06-03:** add postToUniShare utility and wire canvas header handler ([3e13592](https://github.com/unishare-oss/unishare/commit/3e135924d8b2641c3772579cfde3566a3ac82bbc))
- **06-03:** pre-fill exported board PNG in posts/new wizard via sessionStorage ([8eb6872](https://github.com/unishare-oss/unishare/commit/8eb6872a500ccc1fffefeea309691625c516356c))
- **07-01:** add RoomVisibility enum, PATCH /rooms/:slug, ownerId in joinRoom ([8717457](https://github.com/unishare-oss/unishare/commit/87174579e97942d01606a1f0518f28f4cd2433d0))
- **07-02:** add isViewOnly guard and PRIVATE room block to collab gateway ([31d4945](https://github.com/unishare-oss/unishare/commit/31d4945acf4f313ed5c939bb1915e61cbfc3aa20))
- **07-03:** 403 private gate, isViewOnly/ownerId/userId through context, Excalidraw viewModeEnabled ([ef94ce3](https://github.com/unishare-oss/unishare/commit/ef94ce3d24e23a3f97d91bdbf62d9c806700a7cd))
- **07-03:** owner-only SettingsPopover with visibility radio group and copy link ([182177e](https://github.com/unishare-oss/unishare/commit/182177e727eea4fa69dc9317d05db2cb586ad105))
- **08-01:** add GET /rooms, DELETE /rooms/:slug, extend PATCH /rooms/:slug with title ([df94fc8](https://github.com/unishare-oss/unishare/commit/df94fc82c427381dbecf1992a6ad134a64a2ffa8))
- **08-02:** boards hub page — nav wiring, room cards, create modal, empty state ([714ca9c](https://github.com/unishare-oss/unishare/commit/714ca9ccb7381f36abc035047fb3770050a9d95c))
- **09-01:** install bcryptjs, add passwordHash schema, extend DTOs/entity/repository ([5f44b16](https://github.com/unishare-oss/unishare/commit/5f44b1609f71fea547a1f4acc11c233e1a1693cf))
- **09-01:** service password logic, controller @Body, unit tests (TDD) ([8235dda](https://github.com/unishare-oss/unishare/commit/8235dda130819da1ac12c30caa56d70f8151f820))
- **09-02:** password gate on canvas page + shake animation CSS ([dbd722b](https://github.com/unishare-oss/unishare/commit/dbd722b15cdcf66d29cebf1e1f39ddb417964c50))
- **09-02:** settingsPopover password section + roomCard badge + boards page prop ([b973381](https://github.com/unishare-oss/unishare/commit/b973381274cbcb8a2a6720dbdc8c2b6be3f41875))
- **09:** add visibility and password fields to create board dialog ([78e2419](https://github.com/unishare-oss/unishare/commit/78e241940f3416fc7f7f90a0196b6da5cb040414))
- add /feed route, redirect / → /feed, fix 404 back link ([cafd7cf](https://github.com/unishare-oss/unishare/commit/cafd7cfd3cb7264e61737230e746e05a3961046a))
- add active indicator to chat sidebar items ([7aacdbe](https://github.com/unishare-oss/unishare/commit/7aacdbe09966456c5894c1c89eff92d5ab9521a3))
- add AI content screening to flag problematic posts before moderation ([e244605](https://github.com/unishare-oss/unishare/commit/e244605404e7b6cecdf8d5841a78279d5095972c))
- add AI content screening to flag problematic posts before moderation ([a54cc09](https://github.com/unishare-oss/unishare/commit/a54cc092ce76239c15470ea2b0e47b4733d58190))
- add ai post summarization with multi-provider support ([d750241](https://github.com/unishare-oss/unishare/commit/d7502414f58f9b4c9b8b42a4f5e061840bf81632))
- add ai post summarization with multi-provider support ([47738f8](https://github.com/unishare-oss/unishare/commit/47738f86d5d1300745bcd71df4f1a20c0962dd3c))
- add animated page transitions to chat routes ([f967ab5](https://github.com/unishare-oss/unishare/commit/f967ab5a1e30770b798b1a879b16a114e1966bdd))
- add Chat | Unishare page title ([5c75ea9](https://github.com/unishare-oss/unishare/commit/5c75ea9d7fb3d384d30888c3f3213d71a1d3edb5))
- add Chat | Unishare page title ([45433f2](https://github.com/unishare-oss/unishare/commit/45433f2240222b3d543afa6b195d5698cd55f0fc))
- add collection picker to bookmark button ([54ba3a7](https://github.com/unishare-oss/unishare/commit/54ba3a7899e2bc720a67bf0ac8a817aabd788371))
- add feedback button to mobile More sheet ([a5d77d9](https://github.com/unishare-oss/unishare/commit/a5d77d9a9ee510dcbbad0c7ddbe580e0724b4d71))
- add followers/following dialog, lists tab, followingCount on profile ([0a9eeb1](https://github.com/unishare-oss/unishare/commit/0a9eeb1f0a3f157ee3dc71e3a99465d98744c1f2))
- add followers/following dialog, lists tab, followingCount on profile ([1fec697](https://github.com/unishare-oss/unishare/commit/1fec69788f10b5744391b4d5333911382febe730))
- add followingCount, public reading lists by user endpoint ([f63fb03](https://github.com/unishare-oss/unishare/commit/f63fb031cb86744c3c262a61ec8e9426c6239ad3))
- add followingCount, public reading lists by user endpoint ([3f9edb6](https://github.com/unishare-oss/unishare/commit/3f9edb6e0adf78d98ce48c501c2bd2d59b1cbcf5))
- add font size control UI to appearance settings ([81ea92a](https://github.com/unishare-oss/unishare/commit/81ea92a109e1b8d8b3a078461461e14fe769f306))
- add optimistic UI updates for rooms when sending messages ([6cc5377](https://github.com/unishare-oss/unishare/commit/6cc5377d33d9b776591e49d2ac505c94ab9fe0b7))
- add PDPA compliance (consent, data export, privacy policy) ([e4a2d86](https://github.com/unishare-oss/unishare/commit/e4a2d8690dc3d4736238a89b26d6c5f3b70de4fa))
- add reading lists module (backend) ([b953ac2](https://github.com/unishare-oss/unishare/commit/b953ac2daffa9f1403a5e2948aaa0659bdbf85a0))
- add reading lists module (backend) ([2f2e4f9](https://github.com/unishare-oss/unishare/commit/2f2e4f939ed8cf7d5b7f0cb545b1392296f9ef7c))
- add reading lists ui with sidebar, edit, delete ([ace512e](https://github.com/unishare-oss/unishare/commit/ace512e54357506934063c984ef0a5458abdeee6))
- add reading lists ui with sidebar, edit, delete ([ab71a41](https://github.com/unishare-oss/unishare/commit/ab71a418a18cd4d2499f1d4a8b73fd4d53455ed7))
- add video upload type to storage service ([1332c7f](https://github.com/unishare-oss/unishare/commit/1332c7faee5dba1a75999b12e4f07e3ad9bf5fe2))
- **admin:** reports dashboard with approve/dismiss actions ([cb76334](https://github.com/unishare-oss/unishare/commit/cb763341392cd4ed850f332ab87e5a5d3ed7f6c2))
- animate AI summary with Framer Motion ([fe20054](https://github.com/unishare-oss/unishare/commit/fe20054915e30eae77c27e4795f37aea05e728f7))
- animate AI summary with Framer Motion ([0815fcb](https://github.com/unishare-oss/unishare/commit/0815fcbb72bff00ef02963090cb79f34188a177e))
- assignment disclaimer + shorten consent label ([66a68f7](https://github.com/unishare-oss/unishare/commit/66a68f7f6df806d00995ce7f8e9a18d56b222a45))
- auto-render URLs as links in comments ([c29375b](https://github.com/unishare-oss/unishare/commit/c29375b08790789c2bce58e4892abfb12a15f957))
- auto-render URLs as links in post descriptions ([b7ee7ad](https://github.com/unishare-oss/unishare/commit/b7ee7ad89b69b0a80096af99a57291c8446b0e5b))
- auto-tag posts using LLM after summarization ([5ed07f8](https://github.com/unishare-oss/unishare/commit/5ed07f86bd820d040848e8538ad4d20a9790729b))
- auto-tag posts using LLM after summarization ([f8b7593](https://github.com/unishare-oss/unishare/commit/f8b7593821b3bc1fccc2fbd1964a1478b6ab3904))
- background upload for large files (>10MB) ([4c7031e](https://github.com/unishare-oss/unishare/commit/4c7031e7840431286fe0557c30ee6e5a99808b5b))
- **boards:** add password management functionality for rooms and update visibility descriptions ([5efbb49](https://github.com/unishare-oss/unishare/commit/5efbb49afaa146eb854089657cb1bde6a9d456a2))
- **chat :** implement chat sidebar ([b3862b9](https://github.com/unishare-oss/unishare/commit/b3862b9eeb42fc1c4d28a3bb3165fdccbabcc4f4))
- **chat :** implement chat test ([9f940af](https://github.com/unishare-oss/unishare/commit/9f940af92d03756531b590322bba2337fbeab3ce))
- **chat :** implement repository layer for chat ([360c682](https://github.com/unishare-oss/unishare/commit/360c6822fdae89ba26ce632a95f1c7574ad2fe57))
- **chat-window:** implement link rendering in messages and add info pane toggle functionality ([bb0ee88](https://github.com/unishare-oss/unishare/commit/bb0ee88eb621cac7a6f3968254c47754eda54949))
- **chat:** add timeout for disconnecting func ([b1da907](https://github.com/unishare-oss/unishare/commit/b1da907df5fdc98df1fe3b8c97789e0315cfe2b2))
- **chat:** change date format for clear UI ([5ae48b4](https://github.com/unishare-oss/unishare/commit/5ae48b4b19c5c70163169500536ed92c76c885d1))
- **chat:** implement basic controller layer ([71d212b](https://github.com/unishare-oss/unishare/commit/71d212ba018837ddb3f8d93464119cdce06bbf98))
- **chat:** implement chat header comp ([4f8dcce](https://github.com/unishare-oss/unishare/commit/4f8dcce1e2232494478b685d40851cedfe2e9683))
- **chat:** implement chat module ([287e7a5](https://github.com/unishare-oss/unishare/commit/287e7a5e53d458b738efbe27ab0020a56385c596))
- **chat:** implement chat page ([32f016e](https://github.com/unishare-oss/unishare/commit/32f016e6f2e6c807fe4430543dff4ca5e6374a53))
- **chat:** implement create init msg in room creation ([b57f29f](https://github.com/unishare-oss/unishare/commit/b57f29ff83640924ae9d456b86ef0fd5712294fe))
- **chat:** implement event emiiter in chat ([3b0e4ba](https://github.com/unishare-oss/unishare/commit/3b0e4bab20efa65bb6ed599f1b65418d177f300e))
- **chat:** implement room guard ([e6729f0](https://github.com/unishare-oss/unishare/commit/e6729f0a1cd09d2cb506b08b652a0a408e2da6d8))
- **chat:** implement service layer for chat ([0430257](https://github.com/unishare-oss/unishare/commit/043025787b66b644c92797ea90f348c3c9e2c15c))
- **chat:** implement unified chat window for both new and existing room ([3995220](https://github.com/unishare-oss/unishare/commit/399522082a2f3d5b9a3b12b6286973567d59a8ae))
- **chat:** make entites the same as types ([301e4ba](https://github.com/unishare-oss/unishare/commit/301e4baf98d1bebfd128bbe76abd9f8807588141))
- **chat:** set up chat gateway ([51f1e3b](https://github.com/unishare-oss/unishare/commit/51f1e3b93987d1d80a8de381a047d12a1315f592))
- **collab:** broadcast room visibility changes to connected clients in real time ([88e2326](https://github.com/unishare-oss/unishare/commit/88e23260a569543fb1afe6a95853b159c46a7ea9))
- **collab:** crdt-safe Y.Map element storage ([1fb5753](https://github.com/unishare-oss/unishare/commit/1fb575367cfdb9a5e4e2af2b43ddc470f75983eb))
- **common:** implement paginate-cursor helper function ([f2092d8](https://github.com/unishare-oss/unishare/commit/f2092d8f482d9a6cbefc4972b9b808a172934fc9))
- comprehensive SEO improvements ([2ed7607](https://github.com/unishare-oss/unishare/commit/2ed760721e39089856108b45f302d23a9b7371d1))
- consolidate DM routing via GET /rooms/dm/:userId ([fb5298f](https://github.com/unishare-oss/unishare/commit/fb5298f1b24aec523e3e9b37a4312abc6e997716))
- **course-step:** add searchable dropdown with auto-highlighted result ([6a2e9b9](https://github.com/unishare-oss/unishare/commit/6a2e9b999e0ab553eec8b042c07f716eb0deb52a))
- **course-step:** add searchable dropdown with auto-highlighted result ([0b95ed1](https://github.com/unishare-oss/unishare/commit/0b95ed1e0b8f51f0cc2da6f51206c14ebb1ed40e))
- **dto:** create dto for chat module ([21f6328](https://github.com/unishare-oss/unishare/commit/21f6328538a1833a83aba25eccbd9758c8e3af28))
- **dto:** implement dto for swagger ([3171b90](https://github.com/unishare-oss/unishare/commit/3171b900af844801ccbd6a6cfc1faa43c283aef4))
- enable infinite query generation in orval config ([f1d03c5](https://github.com/unishare-oss/unishare/commit/f1d03c5479faeeb71ee7a3adccf19f6030e6208c))
- **entities:** impelment chat entity for swagger ([151195e](https://github.com/unishare-oss/unishare/commit/151195e1246417683a656d468db3755092bf9ab7))
- **feed:** add module number filter (backend + frontend) ([c8b0de2](https://github.com/unishare-oss/unishare/commit/c8b0de2bcc3462e215d5f49550cf9aa8f1ed9526))
- feedback and bug report system ([64890b8](https://github.com/unishare-oss/unishare/commit/64890b8f8cd323a5259d5511c83c986f5f99700b))
- **feed:** paginate feed with 10 posts per page and windowed page buttons ([99e7df9](https://github.com/unishare-oss/unishare/commit/99e7df93f0e58e0042fe5510e56861e88acc25df))
- **feed:** sync search query to URL as ?q= param in real time ([406133f](https://github.com/unishare-oss/unishare/commit/406133f8869d454a78bdca3a5a56ee6d87fad15d))
- **feed:** wire trending sort and report dialog into feed UI ([16b8d49](https://github.com/unishare-oss/unishare/commit/16b8d490fc9df2aae4a8550d7b30b0b0830f0b8f))
- **filters:** implement ws filter ([7ce51f6](https://github.com/unishare-oss/unishare/commit/7ce51f6ee904a2cf69744c34d69485761153f2ef))
- **follows:** implement followers and following endpoints ([7806657](https://github.com/unishare-oss/unishare/commit/78066577e90ee9dead9a4ae7b35b6ee2a516a5d7))
- **font:** update font families in globals.css and layout.tsx ([1739858](https://github.com/unishare-oss/unishare/commit/173985861fc5b0a9bd6260af28ea16e39a332802))
- **guards:** update chat room guard ([e3104cb](https://github.com/unishare-oss/unishare/commit/e3104cb976849e73f5d67509e54f996dcf1d02eb))
- hide mobile nav bar when inside a chat room ([5516692](https://github.com/unishare-oss/unishare/commit/5516692c40aa20bd2c0bac8af180da9502c3f572))
- **hooks:** add type in lastMessage ([c8866bd](https://github.com/unishare-oss/unishare/commit/c8866bdb745277c89a6e40765085a431e059b5fa))
- implement global font size system with Zustand ([85c5810](https://github.com/unishare-oss/unishare/commit/85c58106cf12536fe8c5ebf028a6d6852b88e984))
- implement infinite scroll for chat messages ([5a7d5e9](https://github.com/unishare-oss/unishare/commit/5a7d5e941f521a92fd4d2aface1834f6cdb9a4de))
- integrate FontSizeProvider into app layout ([df008e2](https://github.com/unishare-oss/unishare/commit/df008e276717166cd1b503d9db45062004615733))
- multipart upload for large files ([8952eff](https://github.com/unishare-oss/unishare/commit/8952effdd29236571169979e988d1ba9206d474d))
- **nav:** replace chat right pane with sidebar mode, add mobile More sheet with full nav ([3031159](https://github.com/unishare-oss/unishare/commit/303115954127eb1313af9b39e6922067cdb07821))
- optimistically insert DM room into sidebar on creation ([776e55d](https://github.com/unishare-oss/unishare/commit/776e55daddf100928d14ee5e998d1ed650c1086b))
- **orval:** add tsconfig in orval config ([8fab613](https://github.com/unishare-oss/unishare/commit/8fab61378083131240f079d207ac246394a62c66))
- polish post detail page ([dbfa26f](https://github.com/unishare-oss/unishare/commit/dbfa26fa80dba7c5b118ebcbeac058d68e7f983f))
- polish post detail page ([8d95205](https://github.com/unishare-oss/unishare/commit/8d952057a17158a6eeba96c28765ad9282665bd2))
- preserve scroll position when loading older messages ([6ae99e3](https://github.com/unishare-oss/unishare/commit/6ae99e3e50a45c3ff3ed185bc5dd781b6d81d2cd))
- **prisma:** add chat system models for DM and Group chats ([96e9159](https://github.com/unishare-oss/unishare/commit/96e9159c4bbede25fe7ec4c2b926895b3e9a1ccf))
- re-enable chat in frontend nav ([71f8934](https://github.com/unishare-oss/unishare/commit/71f89349347ebfeb326ca10c43b1297042ca01f0))
- re-enable chat in frontend nav ([25621c4](https://github.com/unishare-oss/unishare/commit/25621c4d18309ffd9693fd4f923f5cc362a64d64))
- refine AI summary — shadcn Collapsible + Framer Motion + backend guard ([f91cd9a](https://github.com/unishare-oss/unishare/commit/f91cd9a34d13a533c1c88417b97cc2b9cff047fb))
- refine AI summary — shadcn Collapsible + Framer Motion + backend guard ([1d0c802](https://github.com/unishare-oss/unishare/commit/1d0c80214d793927292eaf9d77f01eb42376c084))
- remove past exams filter from feed filter strip ([c4c009e](https://github.com/unishare-oss/unishare/commit/c4c009e20f231a8fdb648d74af35c9f28d8a6c32))
- **search:** include tag name matches in full-text search results ([24ed008](https://github.com/unishare-oss/unishare/commit/24ed008ab694eb49be3ba824ab1dc4e2f20d446e))
- **search:** keyboard navigation in tag autocomplete (↑↓ Enter Tab Escape) ([5ce5555](https://github.com/unishare-oss/unishare/commit/5ce5555ba54d7caa103af3154512233688b2826b))
- **search:** tag autocomplete dropdown in feed search bar using shadcn Popover + Input ([1055321](https://github.com/unishare-oss/unishare/commit/105532185161576830ba9867fb9e9b07bb3fccef))
- support video file uploads and inline preview ([0aaceb4](https://github.com/unishare-oss/unishare/commit/0aaceb443ae71f364c21e0e611da2bec55bd77d6))
- sync with origin/main ([9ca5e0c](https://github.com/unishare-oss/unishare/commit/9ca5e0ca2fb57552f1af3ababc252a9559ae3b9f))
- **tags:** display tags on post detail page ([3dbd0c4](https://github.com/unishare-oss/unishare/commit/3dbd0c466fcb92870cb25a00c0e407eef7f22d25))
- **tags:** make tags clickable — clicking filters feed by tag name ([60fd4de](https://github.com/unishare-oss/unishare/commit/60fd4de5bee8073438b8142c8bc7e2e38d0fab9f))
- **tags:** wire ?tag= to tagSlug filter on feed endpoint instead of FTS search ([ce7458b](https://github.com/unishare-oss/unishare/commit/ce7458b6960bd3ca1bd5e162945f278a77567986))
- **tags:** wire TagInput into post create/edit and render tags on feed cards ([cca62d1](https://github.com/unishare-oss/unishare/commit/cca62d15d28e94b750880a77c5f459e252b89a59))
- **types:** implement utility type ([f1f13a5](https://github.com/unishare-oss/unishare/commit/f1f13a5f8ff31de84e99cbcea24d8563a96ceb5a))
- update chat window and info pane UI ([e716366](https://github.com/unishare-oss/unishare/commit/e716366e349f5a39f79877eef0b29a5b45a740df))
- warn before leaving page during active background upload ([6d9a841](https://github.com/unishare-oss/unishare/commit/6d9a8418ce66bc55990c9d7cf0772a7d8c93a173))
- **web:** add dynamic OG metadata for canvas pages ([2749509](https://github.com/unishare-oss/unishare/commit/2749509627d51479192098a36d1d0f5a96dd739d))

### Performance Improvements

- **collab:** bump canvas + cursor sync to 60fps, server relay buffer to 8ms ([b22cee6](https://github.com/unishare-oss/unishare/commit/b22cee6f7249db3eeeb5e29bb50329d6789a2980))
- **collab:** reduce memory pressure on low-RAM servers ([232a383](https://github.com/unishare-oss/unishare/commit/232a383db18ecd0849ba80c749dcf176e87f6e74))
- **collab:** revert and rollback to 60fps ([3286a48](https://github.com/unishare-oss/unishare/commit/3286a488f6794a19d61a959131943cb12cb732dc))
- **trending:** use \_count instead of loading all reactions/comments into memory ([c3432d5](https://github.com/unishare-oss/unishare/commit/c3432d541d4f327e8283a4be6f49f65d2dfd728a))

### Reverts

- undo DM route consolidation ([2384cc0](https://github.com/unishare-oss/unishare/commit/2384cc0dc592fcbce8bd3c1337c69c53442c0f31))

# Changelog

All notable changes to this project will be documented in this file. See [semantic versioning](https://semver.org/) for commit conventions.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Font size control system with 7 levels (xsmall to xlarge)
- Global font scaling via CSS variables
- Improved post detail page spacing and typography

### Fixed

- Sidebar scrolling in navigation
- Font weight for better readability

---

## Older Releases

See [GitHub Releases](https://github.com/unishare-oss/unishare/releases) for the complete history.
