import { SetMetadata } from '@nestjs/common'

export const GUEST_READ_ONLY = 'guestReadOnly'

/** Marks a content controller: guests may read it, and `GuestReadOnlyGuard` refuses the rest. */
export const GuestReadOnly = () => SetMetadata(GUEST_READ_ONLY, true)
