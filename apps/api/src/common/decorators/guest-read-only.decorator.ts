import { SetMetadata } from '@nestjs/common'

export const GUEST_READ_ONLY = 'guestReadOnly'

/**
 * Marks a content controller: guests may read it, and `GuestReadOnlyGuard` refuses the rest.
 * `@GuestReadOnly(false)` on one method lets guests call it (a POST that only records a read).
 */
export const GuestReadOnly = (readOnly = true) => SetMetadata(GUEST_READ_ONLY, readOnly)
