import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LineupCard, LINEUP_CARD_FRAME_SIZE } from './lineup-card';
import { LineupList } from './lineup-list';
import { LineupPitch } from './lineup-pitch';
import type { LineupSlot, LineupSlotPlayer } from './lineup-pitch';
import { getFormationTemplate } from '#/football/data/formations';
import { captureElementToPng } from '#/utils/export';

/**
 * The BTL lineup social export card, at all four of its authored frames.
 *
 * Every story renders at the card's TRUE pixel size (1212x1200 / 1000x1200),
 * not a scaled preview — see `LineupCard`'s module doc for why that is a
 * correctness requirement of the capture path rather than a presentation
 * choice. `Verify/CaptureIsExactFrameSize` measures it.
 */
const meta = {
  title: 'Football/Compositions/LineupCard',
  component: LineupCard,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    frame: { control: 'select', options: ['square', 'portrait'] },
  },
} satisfies Meta<typeof LineupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hero photograph stand-ins.
 *
 * Deliberately tiny inline JPEGs rather than remote URLs: the stories run in
 * a headless browser in CI, and a card whose hero is a network fetch would
 * make both the visual stories and the capture measurement flaky for reasons
 * that have nothing to do with this component. Real usage passes an author's
 * uploaded photo URL — the shape and crop behaviour are identical, these just
 * stand in for the subject.
 */
const HERO_WARM =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAsKADAAQAAAABAAAAegAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAegCwAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMADw8PDw8PGg8PGiQaGhokMSQkJCQxPjExMTExPks+Pj4+Pj5LS0tLS0tLS1paWlpaWmlpaWlpdnZ2dnZ2dnZ2dv/bAEMBEhMTHhweNBwcNHtURVR7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e//dAAQAC//aAAwDAQACEQMRAD8AlpabRXAekOzS5pmaWgB1FNzS0DHUU3NFIB9GabmjNAD80U3NFADqWm0UDHZpc0zNLQA7NLTM0uaQDs0U2loGOozTc0UAf//QdRTaWuA9EdRmm0UDH5opuaM0AOzS03NFADqXNMpaBjs0tMzS5pAOoptLmgB2aM02igY/NFNzRmgB2aWm5ooAdS02ikB//9FuaWmUua4T0R2aWm5ooAdRmm0uaBjs0U2lzSAdmim5ooAdS02jNAx2aXNNooAdS03NFADs0U3NLSGOozTc0tADqKbmloA//9KLNFNozXEeiPzRmm5opAPzRTc0UAOzS02igY6lzTc0ZoAdRTaWkA7NGabmigB9FNzS5oGOoptFADqXNNooAfmimZpc0hn/061LTc0VxHoDqXNMzS0DHZpaZS5oAdRmm0tIB1FNzS5oGOzRTaM0AOzS02igB1LmmZpaAHZpaZS5pDHUU2loAdRmm0ZoA//Up5opuaWuM9AdRmm0UgH5opuaM0APopuaKBjs0tNooAdmlzTM0uaQDs0U3NLQMdRTaKAH5optGaAH0ZpuaKBjqWm0ZpAf/9XPzS02jNcZ3js0tNzRQMdRTaXNADs0ZptLSAdRTc0tAx2aKbmigB2aXNNzRQA6lpuaM0AOpc0ylpDHUZpuaXNADqM02lzQB//WzM0ZpKK5DvHUZpKKQDqKbS0DFzS5ptLQAtLTaWgBaWm0UDHUZpKKQDs0UlFADqM0lFAC0uabS0DFzS5ptLSA/9k=';
const HERO_COOL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA8LDA0MCg8NDA0REA8SFyYZFxUVFy8iJBwmODE7OjcxNjU9RVhLPUFUQjU2TWlOVFteY2RjPEpsdGxgc1hhY1//2wBDARARERcUFy0ZGS1fPzY/X19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX1//wAARCAB6ALADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAEGBAUHAwL/xAArEAEAAgIBAwMDAgcAAAAAAAAAAQIDEQQFBiESEzEUQVE0ciIjMjVScZH/xAAYAQEAAwEAAAAAAAAAAAAAAAAAAQIEA//EAB0RAQACAgMBAQAAAAAAAAAAAAABAgMREiExIkH/2gAMAwEAAhEDEQA/AKgIEuaRACRACRACRACRACRACRACRACRACRAAAJAAAAAAAAAemHFObLXHX5mQe/C4OXmX9NI8feW+x9u4YpHrvM2bLp/ErxOPWkR515llOFrz+NNccRHapdQ6Jk49ZyYp9VIaeY1OpdEtWLVmJjcSp/W+D9LyJvWP4LeV6X31LnkpruGrAdHIAAABAAAAAAAAAADb9vYoyc31TH9MNQsfbERvLKt+oXpH0sYDM1jV9fwxk4M215q2jF6jETwsu/8U19VtG4URCZ+ZQ1MYAAAAAAAAAAAAAAsHbOSIyZKfeVfbDo/I+n5tZmdRbxKto3C1J1ZdgiYmImPiRmaxh9VyRj4GSZ+8aZjR9x8mKYIwxPm3ytWNyi06hVp+ZQDSxgAAAIAAAAAAAAABKwdB7ey8+0Zsu6Yonf+ztros9Qze7miYxVn/roeHFTDjjHjrFax8RAmIavNwvYrWKbmsRpjt/MRMamHhbi4rTuauVse/HeuTXrVYsVstoiIYXXe3J5VPfwW/mVj4/Kz0x0pGqxp9LVpxUvbk45mxXw5Jx5KzW0fMS83Qu5ehY+VhtycFdZaxudfdz+9Zpaa2jUwu5PkAAAAAAAAAAAB7cXBbkcimKkbm06eKx9ncWM3UfctHikbErx0vh14XCx4axqYjyzAEgAAAExExMT8S5z3X036TnTlpXWPJ5dGaHuzixn6Xa2t2p5gJc2AFQAEAAAAAAAAL32Pg9PHy5t/M6UR0Hsn+3X/AHCYWcASAAAAMXqOL3uDmpvW6yynlyv02T9sg5Bmr6M16/idPN7cr9Tk/dLxFQAAASAAAAAAL12Pn9XHy4dfE7UVbex5n6rLG/GgXsASAAAAMXqOX2eDmvreqyymq7imY6Rm1P2By/Nb15r2/M7fBPzIIAAf/9k=';

/**
 * Player headshot stand-ins, one per member of the sample XI.
 *
 * Generated abstract placeholders — a two-tone gradient ground with a lighter
 * head-and-shoulders arc — for the same two reasons the hero fixtures above
 * are: the stories must not touch the network in CI, and viz must not carry
 * licensed player photography in its repository. Real usage passes BTL CDN
 * headshot URLs; the shape, the circular clip and the ring behaviour are
 * identical, these just stand in for the faces.
 *
 * They are deliberately DISTINCT per player so a marker rendering the wrong
 * player's photo would be visible rather than plausible.
 */
const HEADSHOT: Record<string, string> = {
  pickford:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAklEQVR42q3S3UpCQRTF8fUgFkmZKGapGMePlJNWWBaiiAgiZVSEECH0TD2Gz+AbdbFhGDxnL8fOwO9y1v9iM+i+/3iH69eVdwhfvr1De/7lHVqzpXdoTj93+l1vDJf3aEw+CDtn4yvUxm8arSjIEMFwoeFRMsTl4FnDo2SI6uM8Fi8KbYvKwyyWS1TbotybaniRDHFxO9HwKBnivDsmtCJf4SwccdHizgkK7YF3yF89eYdcvU9oN+UrZIP7WC7/VNvitHoX5VIUsXOcVG62uBdFtIDjUse2b1FsRZAuhsb/isLu4KjQMpJE7Q4Oc02RpChMCgfZukgeNSmkMoFIHjWpP2+uEzsykTt/AAAAAElFTkSuQmCC',
  james:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAUlEQVR42q3S3UpCQRTF8fUghZkfmJhmpunhdPATKSuEEBFEQpCIICLomQLfxjfqYsMweM5ejp2B3+Ws/8VmMHz68Q79ybd36N1/eYfu+NM7RKMP73A3eD/od7szXN4j7L8Rds7GVwi6G41WFGSITrTW8CgZoh2+aniUDNEKVol4UWhbNDvLRC5RbYub24WGF8kQ1825hkfJEPXGjNCKfIWr+gsXLx6coFqbeofL6rN3qFQeCe2mfIVy+SGRyz/VtrgojeNciiJxjlJxtMe9KOIFFAsD27FFsRdBIdcz/lcUdgf5bGSkidodnGdCkaYoTArZ00Ckj5oUzk7aIn3UpP4A25fbHOrCnEEAAAAASUVORK5CYII=',
  stones:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABA0lEQVR42q3S3UoCURTF8fUgGYVhFJkyfjTpMOZHKZOYFCFCRAQREYgIPVOv0Gv4Rl1sOByc2cujc+B3edb/YnPwOPjxDtPeyjs8dJfeYdJZeIdx/O0d7qOvrf5+14bLeyTtT8LO2fgKo+sPjVYUZIhh+K7hUTLEXfNNw6NkiEHjNRMvCm2Lfu0lk0tU26IXzDW8SIa4qc40PEqG6FSeCa3IV4jLT1y6uHWC6GLqHdrnE+/QOhsT2k35CuFpksnln2pbXJWGaS5FkTlH8+R2g3tRpAuoF/u2XYtiI4LacdfYryjsDoKj2MgTtTuoHkYiT1GYFCqFlsgfNSlcHoQif9Sk/gG6EvtUY69uwwAAAABJRU5ErkJggg==',
  colwill:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAklEQVR42q3S3UpCQRTF8fUgJUmhGEqSWH7l4ZQWaoWIWWghIpYhQQQ9U0/jhW/UxYZh8Jy9nDoDv8tZ/4vNYNX69g7vl1/e4S389A6L4MM7zJsr7zBrLHda/2wMl/eY1l8JO2fjK7xU5xqtKMgQk8pMw6NkiPHZVMOjZIin8nMsXhTaFqPSOJZLVNtiePqo4UUyxKD4oOFRMkT/ZEBoRb7CfaHPRYs7J7jN33mH7nHPO3RyHUK7KV/hJnsdy+Wfalu0M60ol6KInePqKNziXhTRAsLDwPbXotiKIEg3jP8Vhd3BxUHNSBK1O6inzkWSojApVPfLInnUpFDZK4nkUZP6BcS5M51sssWcAAAAAElFTkSuQmCC',
  oreilly:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAklEQVR42q3S3UpCQRTF8fUgFkmZKGapGMePlJNWWBaiiAgiZVSEECH0TD2Gz+AbdbFhGDxnL8fOwO9y1v9iM/jpvnuH1fWrd/gOX7zDV3vuHZatmXf4bE532vyuDZf3+GhMCDtn4yu81cYarSjIEItgqOFRMsTz5UDDo2SIefUxFi8KbYtZ5SGWS1TbYlruaXiRDDG5uNXwKBlifN4ltCJfYXQWctHizgkGhbZ3eMpfeYd+rk5oN+Ur3GeDWC7/VNvi7rQa5VIUsXPcnFS2uBdFtIDOccm2b1FsRRCmi8b/isLuoHVUMJJE7Q6ahzmRpChMCvWDrEgeNSkEqYxIHjWpPyGtEztzDEIGAAAAAElFTkSuQmCC',
  rice: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAUlEQVR42q3S3UpCQRTF8fUghVpqJiomWmpqHvMjRESQCEFEBIkIIoKeqQufxjfqYsMweM5ejp6B3+Ws/8Vm8Nufeoef3sQ7fAdj7/DVffEOn52hd/ho94/a/+0Ml/d4b/UIO2fjK2ybgUYrCjLEpvGk4VEyxLre1vAoGWJ1/xiJF4W2xbLWiOQS1bZYVB80vEiGeKvUNDxKhni9qxJaka8wL1e4cPHoBLNS2TtMiyXvMCkUCO2mfIVxPh/J5Z9qW4xuc2EuRRE5xyB3c8C9KMIFPGcztlOL4iCCIHNtnFcUdgeddMqIE7U7aF0lRJyiMCk0U5ciftSkUE9eiPhRk/oHRX/dalPI3uUAAAAASUVORK5CYII=',
  wharton:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABA0lEQVR42q3S3UoCURTF8fUgGYVhFJkyfjTpMOZHKZOYFCFCRAQREYgIPVOv0Gv4Rl1sOByc2cujc+B3edb/YnPw8zjwDqtpzzssH7reYTHpeIfvcewdvu6jrdZ/v4bLe3wmbcLO2fgKH6NrjVYUZIj3YajhUTLE211Tw6NkiNdBIxMvCm2Ll34tk0tU22LeCzS8SIaY3VQ1PEqGeO5UCK3IV3iKy1y6uHWCaXThHSbtc+8wbp0R2k35Ckl4msnln2pbDK9KaS5FkTnHbfNkg3tRpAvo14u2XYtiI4Ju7djYryjsDuLgyMgTtTuIqociT1GYFFqVgsgfNSmElwcif9Sk/gGD6ftUHyppywAAAABJRU5ErkJggg==',
  bellingham:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAklEQVR42q3S20pCQRjF8fUgFUmSFElhJVt25mnjIUQUkcpDBxGRRIigZ+ppuuiNuvhgGNz7W07tgd/lrP/Fx+DzLfIOH6u6d3hf1rzDZlHxDuv5rXdYvdzs9PP9Zbi8x/IpJOycja+wmJU0WlGQIV4ngYZHyRDPj0UNj5IhpvfXiXhRaFuMR5eJXKLaFg/DgoYXyRCjwYWGR8kQw/45oRX5Cv1enosXd07Q6555h+7dqXfotE8I7aZ8hVYzl8jln2pbRNFxnEtRJM5Rb2S3uBdFvIBq7cj216LYiqBcyRj/Kwq7g7B8aKSJ2h0E4YFIUxQmhWJpX6SPmhSugj2RPmpSv3b0MxV0yWPAAAAAAElFTkSuQmCC',
  palmer:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAklEQVR42q3S3UpCQRTF8fUgKophJYlhJZpy/KiDICKK9EmliCIihAQ9k6/hK/RGXWwYBs/Zy6kz8Luc9b/YDFbf995h8dX1DvNtxztMP1ve4X0TeIfXdfOo/c/OcHmP51WDsHM2vsLjsq7RioIMMZnXNDxKhhjPqhoeJUMMP25i8aLQthi8XcVyiWpb9F8qGl4kQ/SeLjU8SoYIH8qEVuQrdCclLlo8OkF7dOEdgmHROzQG54R2U75CvX8ay+WfaltUe4Uol6KIneM6PDngXhTRAip3edtfi+IggnInZ/yvKOwOSkHWSBK1Oyg2MyJJUZgUzm7TInnUpFCopUTyqEn9Anb7Fks38XVRAAAAAElFTkSuQmCC',
  kane: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABAUlEQVR42q3S3UpCQRTF8fUghVpqJiomWmpqHvMjRESQCEFEBIkIIoKeqQufxjfqYsMweM5ejp6B3+Ws/8VmMP3te4fJT887jL8D7/Dy1fUOw8+Od+h/tI/a7f8Ml/fovbcIO2fjKwTbpkYrCjLE06ah4VEyRHtd1/AoGeJxdR+JF4W2RWNZi+QS1bZ4WFQ1vEiGqL1VNDxKhqi+3hFaka9QmZe5cPHoBOVZyTuUpkXvUJgUCO2mfIX8OB/J5Z9qW+RGt2EuRRE5x80gd8C9KMIFZJ6ztlOL4iCC6yBjnFcUdgepTtqIE7U7SLSuRJyiMClcNlMiftSkcFFPivhRk/oH5LrdaqRWF/MAAAAASUVORK5CYII=',
  saka: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAIAAAD9b0jDAAABA0lEQVR42q3S20oCURjF8fUgGYVRJOYhD406jY2HJCstIiQICSEigpDAZ+oVfI3eqIsPNhtnvuWu2fC73Ot/8bExWN17h97X1DvEy4l36H7eeofo49o7hO/jrb5/1obLe3Tergg7Z+MrtF5HGq0oyBDB4lLDo2SI5stQw6NkiMZ8kIoXhbZF7bmXyiWqbXH6FGt4kQxRmV1oeJQMUX6MCK3IVzh5OOeSxa0TFO9C71CYtL3D8U2L0G7KVzgaB6lc/qm2xeHoLMmlKFLnOBg2NrgXRbKAfL9u+2tRbESwH9eM/xWF3cFeVDWyRO0OdsOKyFIUJoVcuyyyR00KO0FJZI+a1C9nevnW57zbRQAAAABJRU5ErkJggg==',
};

/**
 * The Figma file's own sample XI, in team-sheet order. Reece James wears the
 * armband, which is what exercises the captain badge in the portrait frames.
 */
const ENGLAND_XI: LineupSlotPlayer[] = [
  { id: 'pickford', name: 'Jordan Pickford', shirtNumber: 1, imageUrl: HEADSHOT.pickford },
  { id: 'james', name: 'Reece James', shirtNumber: 24, isCaptain: true, imageUrl: HEADSHOT.james },
  { id: 'stones', name: 'John Stones', shirtNumber: 2, imageUrl: HEADSHOT.stones },
  { id: 'colwill', name: 'Levi Colwill', shirtNumber: 6, imageUrl: HEADSHOT.colwill },
  { id: 'oreilly', name: 'O’Reilly', shirtNumber: 3, imageUrl: HEADSHOT.oreilly },
  { id: 'rice', name: 'Declan Rice', shirtNumber: 4, imageUrl: HEADSHOT.rice },
  { id: 'anderson', name: 'Elliot Anderson', shirtNumber: 8, imageUrl: HEADSHOT.bellingham },
  { id: 'palmer', name: 'Cole Palmer', shirtNumber: 7, imageUrl: HEADSHOT.palmer },
  { id: 'bellingham', name: 'Jude Bellingham', shirtNumber: 10, imageUrl: HEADSHOT.bellingham },
  { id: 'kane', name: 'Harry Kane', shirtNumber: 9, imageUrl: HEADSHOT.kane },
  { id: 'saka', name: 'Bukayo Saka', shirtNumber: 18, imageUrl: HEADSHOT.saka },
];

/**
 * The same XI laid onto a 4-3-3, for the pitch body.
 *
 * `x` is MIRRORED (`100 - x`) so the keeper sits at the TOP of the pitch and
 * the front three at the bottom, which is how the Figma pitch frame draws it.
 * viz's `portrait` orientation is defined the other way up — own goal at the
 * bottom, attacking UP the screen — because that is the convention the
 * editor's Lineup block and the Match Centre already ship.
 *
 * This needs no new prop and is not a hack: `variant="full"` draws a complete
 * pitch, which is symmetric under a 180-degree rotation (penalty area, goal
 * area, penalty spot and arc at BOTH ends, plus a centred halfway line, circle
 * and spot). So mirroring where the players sit is exactly equivalent to
 * turning the pitch around, and nothing about the markings gives it away.
 * Only the XI's own coordinates change — the formation template itself is
 * untouched, and `LineupPitch` is unmodified.
 */
function englandSlots(): LineupSlot[] {
  const template = getFormationTemplate('4-3-3');
  const order = [
    ENGLAND_XI[0],
    ENGLAND_XI[1],
    ENGLAND_XI[2],
    ENGLAND_XI[3],
    ENGLAND_XI[4],
    ENGLAND_XI[5],
    { id: 'wharton', name: 'Adam Wharton', shirtNumber: 14, imageUrl: HEADSHOT.wharton },
    ENGLAND_XI[8],
    ENGLAND_XI[7],
    ENGLAND_XI[9],
    ENGLAND_XI[10],
  ];
  return template.map((slot, i) => ({
    x: 100 - slot.x,
    y: slot.y,
    role: slot.role,
    player: order[i],
  }));
}

/**
 * The pitch body, restyled for the card.
 *
 * Everything the Figma pitch frame asks for comes out of `LineupPitch`'s
 * EXISTING props — `orientation`, `markerContent`, `showNames`, `lineColor`,
 * plus the dark theme's own `#1f1f1f` grass default, which already matches
 * the file. No new props were needed.
 *
 * `orientation` is passed explicitly rather than left to the default: the
 * card must keep drawing a portrait pitch regardless of what that default
 * happens to be.
 *
 * `teamName`/`formation` are deliberately NOT passed. `LineupPitch` prints
 * its own team + formation chip above the pitch in read-only mode, and the
 * card already carries both in its own headline and footer — omitting them is
 * what suppresses the duplicate, with no new prop required.
 *
 * `fit` and `pitchPadding` are NOT passed, and that is the point: inside a
 * `LineupCard` they resolve to `height` / `0` on their own, so a host
 * composing this card gets the slot fit without having to know the numbers.
 * 0.11.0 passed `pitchPadding={1.7}` here to fake it — that sized the drawing
 * to the slot's 734px height but left the pitch's BOX at 515x772.5, hanging
 * 19px past the slot top and bottom. `PitchFitsCardBodySlot` measures the
 * repair.
 *
 * `shrink-0` stops the flex slot from squeezing the pitch: without it the
 * pitch collapses to ~420px wide and floats in the middle of the slot.
 */
function CardPitch() {
  return (
    <LineupPitch
      slots={englandSlots()}
      orientation="portrait"
      markerContent="headshot"
      showNames
      editable={false}
      theme="dark"
      // The Figma pitch is a hairline drawing on the card's own dark ground,
      // far lighter than `Pitch`'s `#2b2b2b` dark-theme default. Grass is left
      // unset — `LineupPitch`'s dark default is already the file's `#1f1f1f`.
      lineColor="rgba(255,255,255,0.5)"
      // 4.354 viewBox units of RADIUS — the Figma's 64px headshot, derived
      // rather than eyeballed. The card's pitch declares a 66.667-unit-wide
      // viewBox across a 489.6px box, i.e. 7.344 px per unit, so the file's
      // 64px disc is a 32px radius is 4.354 units. (Unchanged by the 0.12.0
      // slot fit: that moved the px-per-unit scale by 0.08%, from 7.3502 to
      // 7.3444, because it shrank the pitch's empty BOX and left the drawing
      // where it was.)
      //
      // Was 5.0, whose comment claimed the same 64px but measured 73.5px — 15%
      // over. That mattered for more than the discs: `nameFontSize` is derived
      // from `markerSize`, so the oversized marker also set the name chips at
      // 26.4px against the file's 22px, and the two errors together were what
      // collided the back four's chips. At 4.354 the labels land at 22.98px.
      //
      markerSize={4.354}
      // 2.993 units = the file's own 22px label, at the same 7.344 px/unit.
      // Pinned rather than derived: `nameFontSize`'s default ratio (0.718)
      // would put it at 22.98px, and that ratio is the reader plate's
      // deliberate legibility bump from 0.9.1/0.9.2 — right for a lineup read
      // in a feed, but this card is a design match to a fixed artboard. See
      // the prop's own doc for why the card states the size instead of the two
      // surfaces fighting over one ratio.
      nameFontSize={2.993}
      // Neutral `#2b2b2b` (the file's own chip grey) rather than the default
      // team blue, which would be the only saturated colour on an otherwise
      // monochrome card. It backs each headshot and shows through a
      // transparent one.
      teamColor="#2b2b2b"
      className="w-full shrink-0"
    />
  );
}

/** Figma 3048:11243 — square, split panel, text team sheet on the right. */
export const SquareList: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    formation: '4-3-3',
    heroImageUrl: HERO_WARM,
    heroFocalPoint: { x: 0.5, y: 0.5 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
};

/** Figma 3048:11311 — square, split panel, portrait pitch on the right. */
export const SquarePitch: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    heroImageUrl: HERO_WARM,
    heroFocalPoint: { x: 0.5, y: 0.5 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <CardPitch />
    </LineupCard>
  ),
};

/** Figma 3049:11491 — portrait, full-bleed photo, team sheet overlaid left. */
export const PortraitList: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    formation: '4-3-3',
    heroImageUrl: HERO_WARM,
    // The Figma crop (`left: -14.93%` at `width: 173.06%`) is this cover-crop
    // with x ≈ 0.204 — the subject sits left of centre in the source frame.
    heroFocalPoint: { x: 0.204, y: 0.5 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
};

/**
 * Figma 3049:11549 — the same portrait template, a different photo and a
 * 4-4-2. Proves the template is genuinely reusable rather than tuned to one
 * set of content.
 */
export const PortraitListAltPhoto: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    formation: '4-4-2',
    heroImageUrl: HERO_COOL,
    heroFocalPoint: { x: 0.62, y: 0.42 },
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
};

/**
 * A flat white hero — a MEASUREMENT INSTRUMENT, not a product fixture.
 *
 * The shade stories below have to read the hero shade's opacity out of the
 * rendered card, and over a photograph that is impossible: any sampled pixel
 * mixes the shade with whatever the photo happens to be at that point, so a
 * reading can only ever be compared against another reading, and two readings
 * that are both wrong in the same way agree perfectly. Over a known flat
 * colour the composite inverts exactly — `observed = 255*(1-a) + 13*a`, so
 * `a = (255 - observed) / 242` — and every assertion becomes a comparison
 * against a number derived from the Figma file rather than against another
 * render of the same code.
 *
 * White specifically, because it is the furthest possible from the shade's own
 * `#0d0d0d` and so gives the reading its widest dynamic range: the full 0–1
 * opacity span maps onto 242 of the 255 available levels, and a 1% error in
 * opacity is 2.4 levels rather than a rounding artefact. 8x8 and flat, so the
 * cover-crop's scaling cannot introduce a gradient of its own.
 */
const HERO_FLAT_WHITE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR42mP4jwMwDC0JALoev0GJ6La7AAAAAElFTkSuQmCC';

/** One sampled pixel of a rasterised card. */
interface Sample {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Rasterise a card through the REAL export path and read individual pixels
 * back out of it.
 *
 * Goes through `captureElementToPng` rather than any cheaper approximation
 * because the shade and the brand fill are CSS paint, and the only question
 * worth asking about them is what comes out of the exporter — which is the
 * one artefact a reader ever sees. A test that parsed `background-image` off
 * `getComputedStyle` would pass just as happily on a layer that never
 * composited.
 */
async function samplePixels(
  card: HTMLElement,
  frame: 'square' | 'portrait',
  points: { x: number; y: number }[],
  backgroundColor: string
): Promise<Sample[]> {
  const { width, height } = LINEUP_CARD_FRAME_SIZE[frame];
  const dataUrl = await captureElementToPng(card, { width, height, scale: 1, backgroundColor });
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('captured PNG failed to decode'));
    image.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return points.map(({ x, y }) => {
    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
    return { x, y, r: r!, g: g!, b: b! };
  });
}

/**
 * The shade's opacity at a sampled pixel, recovered from a flat white hero.
 *
 * The green channel alone: the shade is a neutral grey so all three channels
 * carry the same reading, and green is the one a subpixel-antialiasing
 * rasteriser is least likely to shift.
 */
function shadeAlphaAt(sample: Sample): number {
  return (255 - sample.g) / (255 - 13);
}

/**
 * The shade opacity the card SHOULD be painting at `distance` px in from the
 * photo's content-facing edge, given a peak and the surface's own width.
 *
 * This is the Figma gradient stated as arithmetic — peak at the edge, falling
 * linearly to nothing 69.028% of the way across, and flat zero beyond. Every
 * shade assertion below compares a measured pixel against this, so nothing is
 * checked against another render of the same component.
 */
function expectedAlpha(peak: number, distance: number, surface: number): number {
  const reach = surface * 0.69028;
  return distance >= reach ? 0 : peak * (1 - distance / reach);
}

/** Decode a data-URL PNG far enough to read its real pixel dimensions. */
function decodeSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('decode failed'));
    img.src = dataUrl;
  });
}

/**
 * Verification story (not a product story): runs the REAL
 * `captureElementToPng` over a real `LineupCard` and measures the PNG that
 * comes out, so the card's "authored at an exact size" claim is a measurement
 * rather than an assertion.
 *
 * It checks three things that a screenshot could not:
 *
 *  1. The card LAYS OUT at exactly its frame size in the live DOM. This is
 *     the load-bearing one: `html-to-image` clones an already-laid-out node,
 *     so the capture's `width`/`height` size the cloned root but cannot make
 *     its descendants reflow. A card that rendered at some other size would
 *     rasterise that other layout onto a correctly-sized canvas, and the bug
 *     would be invisible in the output dimensions alone.
 *  2. The captured PNG decodes at exactly the frame size at `scale: 1`.
 *  3. `scale: 2` doubles both axes — the retina path social platforms want.
 *
 * Runs against BOTH frames, since their sizes differ on the width axis only
 * and a mixed-up frame lookup would still produce a plausible-looking card.
 */
export const CaptureIsExactFrameSize: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    formation: '4-3-3',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: () => (
    <div>
      <LineupCard
        frame="portrait"
        title="Alternative England XI"
        formation="4-3-3"
        heroImageUrl={HERO_WARM}
        heroFocalPoint={{ x: 0.204, y: 0.5 }}
      >
        <LineupList players={ENGLAND_XI} />
      </LineupCard>
      <LineupCard
        frame="square"
        title="Alternative England XI"
        formation="4-3-3"
        heroImageUrl={HERO_WARM}
      >
        <LineupList players={ENGLAND_XI} />
      </LineupCard>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-card"]');
    expect(cards).toHaveLength(2);

    for (const card of Array.from(cards)) {
      const frame = card.dataset.frame as 'square' | 'portrait';
      const { width, height } = LINEUP_CARD_FRAME_SIZE[frame];

      // (0) The hero photograph actually DECODED.
      //
      // This guards a real failure that every other assertion here is blind
      // to: a truncated, malformed or dead image source still produces an
      // <img> that lays out at exactly the right box size, so the frame
      // measurements below all pass while more than half the card renders as
      // a broken image. It happened — the original HERO_WARM fixture was a
      // base64 string whose length was not a multiple of 4 and which carried
      // no JPEG end-of-image marker, so Chromium rejected the URL outright;
      // geometry was perfect and the photo was simply absent.
      //
      // `naturalWidth` is the only signal that separates "loaded" from
      // "laid out": it stays 0 for an image that never decoded, whatever the
      // element's box says. Note `complete` is NOT sufficient — it goes true
      // on failure too.
      const hero = card.querySelector('img');
      expect(hero, `${frame} card must render a hero <img>`).not.toBeNull();
      if (!hero!.complete) {
        await new Promise<void>((resolve) => {
          hero!.addEventListener('load', () => resolve(), { once: true });
          hero!.addEventListener('error', () => resolve(), { once: true });
        });
      }
      expect(
        hero!.naturalWidth,
        `${frame} hero image must actually decode — naturalWidth stays 0 for a truncated data URI or dead URL, while every size assertion below still passes`
      ).toBeGreaterThan(0);

      // (1) Laid out at the true frame size BEFORE any capture happens.
      expect(card.offsetWidth, `${frame} card must lay out at its authored width`).toBe(width);
      expect(card.offsetHeight, `${frame} card must lay out at its authored height`).toBe(height);

      // (2) 1x capture decodes at exactly the frame size.
      const oneX = await captureElementToPng(card, {
        width,
        height,
        scale: 1,
        backgroundColor: '#151515',
      });
      const oneXSize = await decodeSize(oneX);
      expect(oneXSize, `${frame} PNG must decode at exactly ${width}x${height}`).toEqual({
        width,
        height,
      });

      // (3) 2x capture doubles both axes — the retina density social
      // platforms want.
      //
      // Deliberately only on the PORTRAIT frame, not both. `export.ts`
      // documents that `captureElementToPng`'s timing gets measurably less
      // reliable under heavy parallel load, with
      // `pass-sonar-save-padding.stories.tsx` as the canary; a second 2x
      // capture here would add another ~5.8M-pixel canvas to a suite that
      // already runs its stories in parallel, for no extra information. One
      // frame is enough to prove `scale` multiplies both axes — the per-frame
      // sizing is already covered by (2) above, on both frames.
      if (frame !== 'portrait') continue;
      const twoX = await captureElementToPng(card, {
        width,
        height,
        scale: 2,
        backgroundColor: '#151515',
      });
      const twoXSize = await decodeSize(twoX);
      expect(twoXSize, `${frame} PNG at scale 2 must be ${width * 2}x${height * 2}`).toEqual({
        width: width * 2,
        height: height * 2,
      });
    }
  },
};

/**
 * Verification story (not a product story): measures the card's INTERNAL
 * geometry against the Figma file's own numbers.
 *
 * Frame 3048:11311 draws its body slot at exactly 515x734px, at x 648 / y 418
 * inside the 1212x1200 artboard. Those four numbers only come out right if
 * the content column's asymmetric insets, the 48px and 80px gaps AND the
 * cap-height text trim are all correct together, so they catch almost any
 * drift in the card's rhythm at once. In particular they catch the failure
 * that is easiest to ship by accident: dropping the text trim, which
 * shortens the slot by ~48px while leaving the card looking perfectly
 * plausible on its own.
 *
 * Configured like the pitch frame (no `formation`, so no footer) but with a
 * list body, purely because `LineupList` fills the slot exactly and so gives
 * the measurement a box to read — `LineupPitch` keeps its own aspect ratio
 * and is centred within the slot, so it would measure its own height, not
 * the slot's.
 */
export const MatchesFigmaBodySlot: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <LineupList players={ENGLAND_XI} />
    </LineupCard>
  ),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;
    const body = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-list"]')!;

    const cardBox = card.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();

    // 1px. The slot's position is font-metric INDEPENDENT — every height
    // feeding it comes from `capTrim`'s pinned constants, not from measured
    // glyphs — so this is genuinely exact rather than approximately right,
    // and measures 515x734 @ 648,418 on the nose. The one thing it does
    // depend on is the headline wrapping to two lines, which needs Inter
    // (Storybook loads it); a fallback face wide enough to wrap to three
    // would legitimately change the layout and should fail here.
    const TOLERANCE = 1;
    const near = (actual: number, expected: number, what: string) => {
      expect(
        Math.abs(actual - expected),
        `${what}: expected ~${expected}px from Figma 3048:11311, got ${actual.toFixed(2)}px`
      ).toBeLessThanOrEqual(TOLERANCE);
    };

    near(bodyBox.left - cardBox.left, 648, 'body slot left edge');
    near(bodyBox.width, 515, 'body slot width');
    near(bodyBox.top - cardBox.top, 418, 'body slot top edge');
    near(bodyBox.height, 734, 'body slot height');
  },
};

/**
 * Wait for the state a captured card is actually rasterised in: webfonts
 * resolved, and React's font-swap re-render flushed to the DOM.
 *
 * Name chips size themselves to the REAL measured width of their label
 * (`lib/text-width.ts`), so before Inter arrives they legitimately describe
 * the fallback face the SVG is drawing at that moment, and re-measure when the
 * face swaps. Measuring the card mid-swap would assert against a transient
 * neither the viewer nor the exporter ever sees.
 */
async function settled() {
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/** The card's pitch SVG — the widest one, so the BTL lockup's mark can't win. */
function pitchSvg(root: HTMLElement): SVGSVGElement {
  return Array.from(root.querySelectorAll('svg')).reduce((a, b) =>
    a.getBoundingClientRect().width >= b.getBoundingClientRect().width ? a : b
  );
}

/**
 * The pitch's name-chip `<text>` nodes — the ones backed by a chip `<rect>`,
 * which is what separates them from shirt numbers and empty-slot role labels.
 */
function chipTexts(svg: SVGSVGElement): SVGTextElement[] {
  return Array.from(svg.querySelectorAll('text')).filter(
    (text) => text.parentElement?.querySelector('rect') != null
  );
}

/** Every name chip's backing rect, paired with the label it has to contain. */
function nameChips(svg: SVGSVGElement): { label: string; rect: DOMRect; text: DOMRect }[] {
  return chipTexts(svg).map((text) => ({
    label: text.textContent ?? '',
    rect: text.parentElement!.querySelector('rect')!.getBoundingClientRect(),
    text: text.getBoundingClientRect(),
  }));
}

/** Overlap of two rects, in px per axis. Both positive means they intersect. */
function intersection(a: DOMRect, b: DOMRect) {
  return {
    x: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

/**
 * Verification story (not a product story): the pitch frame's marker and label
 * geometry, measured against the Figma file's own numbers.
 *
 * This is the defect from 0.10.0 written as a test. That build drew the back
 * four's name chips ON TOP of each other — "Colwill"/"O'Reilly" overlapped by
 * 34px, "James"/"Stones" and "Wharton"/"Bellingham" by 1.4px each — from two
 * compounding errors, both invisible to every assertion that existed:
 *
 *  - The marker was 73.5px against the file's 64px, and because the name size
 *    derives from the marker size, that also set the labels at 26.4px against
 *    the file's 22px.
 *  - The chip sized itself with ONE average per-character advance, pinned to
 *    the widest name so nothing clipped. Inter's real advance across these
 *    surnames spans 0.411–0.593em per character, so that single constant made
 *    most chips up to a third wider than their own text.
 *
 * The overlap assertion is the load-bearing one — it is the defect stated
 * directly, and it cannot be satisfied by tuning a font size down until things
 * look separated, because the containment assertion below it fails the moment
 * a chip is made too small for its text. The two together pin the chip to its
 * label from both sides.
 */
export const SquarePitchGeometry: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <CardPitch />
    </LineupCard>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;
    const svg = pitchSvg(card);

    // (1) The card is at its true authored size — every px figure below is
    // only meaningful because the frame underneath them is 1212x1200.
    expect(card.offsetWidth).toBe(1212);
    expect(card.offsetHeight).toBe(1200);
    // The pitch box is fitted to the slot's HEIGHT, not the column's width —
    // 0.12.0's slot fit. `PitchFitsCardBodySlot` measures that relationship
    // directly; here the box size only has to be pinned, because every px
    // figure below is derived from it via the viewBox scale.
    expect(
      svg.getBoundingClientRect().width,
      'pitch box is height-fitted to the 734px slot, so 489.6 wide'
    ).toBeCloseTo(489.6, 0);

    const chips = nameChips(svg);
    expect(chips, 'one name chip per player').toHaveLength(11);

    // (2) NO TWO NAME CHIPS INTERSECT. The defect, as a measurement.
    for (let i = 0; i < chips.length; i++) {
      for (let j = i + 1; j < chips.length; j++) {
        const a = chips[i]!;
        const b = chips[j]!;
        const { x, y } = intersection(a.rect, b.rect);
        expect(
          x > 0 && y > 0,
          `name chips "${a.label}" and "${b.label}" must not overlap — they intersect by ${x.toFixed(1)}x${y.toFixed(1)}px`
        ).toBe(false);
      }
    }

    // (3) Every chip still CONTAINS its own label. Without this, (2) could be
    // passed by shrinking chips until the text spills out of them.
    for (const { label, rect, text } of chips) {
      expect(
        text.left >= rect.left && text.right <= rect.right,
        `name chip for "${label}" must contain its text — chip [${rect.left.toFixed(1)}, ${rect.right.toFixed(1)}], text [${text.left.toFixed(1)}, ${text.right.toFixed(1)}]`
      ).toBe(true);
    }

    // (4) The file's own numbers: a 64px headshot and a 22px label. Both are
    // what (2) and (3) are measured against, and both were wrong in 0.10.0.
    const markers = Array.from(svg.querySelectorAll('image'));
    expect(markers, 'every marker renders a headshot image').toHaveLength(11);
    for (const marker of markers) {
      const box = marker.getBoundingClientRect();
      expect(box.width, 'Figma 3048:11311 draws a 64px headshot').toBeCloseTo(64, 0);
    }
    // `font-size` on an SVG node is in USER UNITS, so it has to go through the
    // viewBox scale before it can be compared with a figure from the file.
    const pxPerUnit = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    for (const text of chipTexts(svg)) {
      expect(
        parseFloat(getComputedStyle(text).fontSize) * pxPerUnit,
        'Figma 3048:11311 sets the name chip in 22px type'
      ).toBeCloseTo(22, 1);
    }

    // (5) Chip padding is the file's flat 8px each side, which is what proves
    // the chip is sized to the MEASURED glyph run rather than to an estimate.
    //
    // The tolerance is 1.5px, and generous on purpose without being loose. Two
    // sub-pixel effects sit under this number: the SVG advance carries the
    // -3% tracking AFTER its final character (so a centred label sits ~0.33px
    // right of the chip's true centre at 22px), and `getBoundingClientRect`
    // on a `<text>` reports ink extents, which differ slightly between
    // rasterisers — measured 8.05px on macOS and 8.50px on CI's Linux for the
    // same render. Neither is drift worth failing over.
    //
    // It still discriminates decisively, which is the point: the estimate this
    // replaced padded "Colwill" by 25.2px and "Rice" by 15.0px against the
    // same 8px target. Nothing that sizes a chip by counting characters lands
    // inside this window on every name at once.
    const PAD_TOLERANCE = 1.5;
    for (const { label, rect, text } of chips) {
      const pad = text.left - rect.left;
      expect(
        Math.abs(pad - 8),
        `name chip for "${label}" pads ~8px to the left of its text (Figma 3048:11311), got ${pad.toFixed(2)}px`
      ).toBeLessThanOrEqual(PAD_TOLERANCE);
    }
  },
};

/**
 * Verification story (not a product story): the headshots are real, decoded
 * images — not the monogram fallback, and not broken image boxes.
 *
 * Applies the lesson of #68 (see `CaptureIsExactFrameSize`'s assertion 0) to
 * the marker photographs. It is the same trap in a new place: `LineupPitch`
 * draws every headshot into a fixed-radius SVG `<image>`, so a dead, truncated
 * or 404 source still lays out at exactly the right size and every geometry
 * assertion in `SquarePitchGeometry` keeps passing over eleven blank discs.
 *
 * Two independent checks, because each is blind to the other's failure:
 *
 *  - `SvgHeadshot` swaps in a monogram disc on `onError`, so a source that
 *    fails LOUDLY leaves no `<image>` at all — caught by the element count.
 *  - A source that fails silently (never decodes, never fires `error`) leaves
 *    the `<image>` in place. `SVGImageElement` exposes no `naturalWidth`, so
 *    the only way to know is to decode the same bytes independently, which is
 *    what the `Image()` load below does.
 */
export const SquarePitchHeadshotsDecode: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <CardPitch />
    </LineupCard>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const svg = pitchSvg(canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card"]')!);

    // (1) Every marker is a photo, so none fell back to a monogram.
    const images = Array.from(svg.querySelectorAll('image'));
    expect(
      images,
      'all eleven markers must render a headshot — a missing one means SvgHeadshot swapped in its monogram fallback'
    ).toHaveLength(11);

    // (2) Every source actually DECODES. `complete` is deliberately not used:
    // it goes true on failure too.
    const sources = images.map((image) => image.getAttribute('href') ?? '');
    expect(new Set(sources).size, 'each player gets a distinct headshot').toBe(11);

    for (const [index, src] of sources.entries()) {
      expect(src, `marker ${index} must have a headshot source`).not.toBe('');
      const width = await new Promise<number>((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve(probe.naturalWidth);
        probe.onerror = () => resolve(0);
        probe.src = src;
      });
      expect(
        width,
        `marker ${index}'s headshot must actually decode — naturalWidth stays 0 for a truncated data URI or a dead URL, while every geometry assertion still passes`
      ).toBeGreaterThan(0);
    }
  },
};

/**
 * Verification story (not a product story): the captain's armband sits on the
 * marker without colliding with the name chip below it.
 *
 * A corner overlay on a marker that already carries a label underneath is
 * exactly the kind of addition that quietly lands on top of that label, so the
 * clearance is measured rather than eyeballed — reusing the same rect
 * intersection the chip-collision story is built on.
 */
export const SquarePitchCaptainBadge: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <CardPitch />
    </LineupCard>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;
    const svg = pitchSvg(card);

    // Exactly one armband — the fixture flags Reece James and nobody else.
    const badges = svg.querySelectorAll('[data-slot="lineup-captain-badge"]');
    expect(badges, 'exactly one captain armband').toHaveLength(1);

    const badge = badges[0]!.getBoundingClientRect();
    for (const { label, rect } of nameChips(svg)) {
      const { x, y } = intersection(badge, rect);
      expect(
        x > 0 && y > 0,
        `captain armband must not overlap the "${label}" name chip — they intersect by ${x.toFixed(1)}x${y.toFixed(1)}px`
      ).toBe(false);
    }

    // It sits on the marker it belongs to: up and to the RIGHT of James's
    // centre, which is the quadrant kept clear of the label below.
    const jamesChip = nameChips(svg).find((chip) => chip.label === 'James')!;
    const badgeCentreX = badge.left + badge.width / 2;
    const badgeCentreY = badge.top + badge.height / 2;
    expect(badgeCentreX, 'armband sits right of its own name chip centre').toBeGreaterThan(
      jamesChip.rect.left + jamesChip.rect.width / 2
    );
    expect(badgeCentreY, 'armband sits above its own name chip').toBeLessThan(jamesChip.rect.top);
  },
};

/**
 * Verification story (not a product story): the team sheet applies the SAME
 * one-captain rule as the pitch.
 *
 * The two bodies of the card read one field (`LineupSlotPlayer.isCaptain`) and
 * must not disagree about who wears the armband when handed the same XI — so
 * `LineupList` renders the badge for the FIRST flagged player only, exactly as
 * `LineupPitch` does. Before 0.11.0 it badged every flagged player, which was
 * unobservable while the pitch drew none at all.
 */
export const ListCaptainBadge: Story = {
  args: {
    frame: 'portrait',
    title: 'Alternative England XI',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: () => (
    <div>
      {/* One captain — the valid case. */}
      <LineupCard frame="portrait" title="One captain" heroImageUrl={HERO_WARM}>
        <LineupList players={ENGLAND_XI} />
      </LineupCard>
      {/* Two captains — caller error; only the first is badged. */}
      <LineupCard frame="portrait" title="Two captains" heroImageUrl={HERO_WARM}>
        <LineupList
          players={ENGLAND_XI.map((player) =>
            player.id === 'kane' ? { ...player, isCaptain: true } : player
          )}
        />
      </LineupCard>
      {/* None — every pre-0.11.0 caller. */}
      <LineupCard frame="portrait" title="No captain" heroImageUrl={HERO_WARM}>
        <LineupList players={ENGLAND_XI.map(({ isCaptain: _ignored, ...player }) => player)} />
      </LineupCard>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const sheets = canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-list-names"]');
    expect(sheets).toHaveLength(3);
    const badgeCount = (sheet: HTMLElement) =>
      sheet.querySelectorAll('svg[aria-label="Captain"]').length;

    expect(badgeCount(sheets[0]!), 'one flagged player is badged once').toBe(1);
    expect(badgeCount(sheets[1]!), 'two flagged players still yield ONE badge').toBe(1);
    expect(badgeCount(sheets[2]!), 'no flag, no badge').toBe(0);

    // And it is the FIRST flagged player (Reece James), not the later one.
    const badged = sheets[1]!.querySelector('svg[aria-label="Captain"]')!.parentElement!;
    expect(badged.textContent, 'the badge belongs to the first flagged player').toContain(
      'Reece James'
    );
  },
};

/**
 * Verification story (not a product story): the hero shade's DEFAULT is the
 * Figma portrait scrim, to the pixel.
 *
 * `heroDimming` exists so an author can push the photograph back, and the one
 * thing it must not do is quietly restyle the cards that already exist. So
 * this measures the unset default against the file's own numbers — a 0.8 peak
 * falling to nothing 69.028% across — rather than against another render of
 * the same component, which is why the hero here is a flat white instrument
 * (see `HERO_FLAT_WHITE`) and every expectation comes out of `expectedAlpha`.
 *
 * Three cards, because the three claims fail independently:
 *
 *  - `heroDimming={0}` must leave the photograph EXACTLY as shot. Not
 *    "almost" — the sampled pixels have to come back pure white, which is the
 *    only reading that proves no layer composited at all.
 *  - the DEFAULT must reproduce 0.8 / 69.028%. Sampled across the full width,
 *    so it pins the ramp's slope and its end, not just its darkest point: a
 *    scrim with the right peak and the wrong reach passes at x=2 and fails at
 *    x=250.
 *  - a RAISED value must actually darken, measured, at the same coordinates.
 */
export const PortraitShadeMatchesFigma: Story = {
  args: { frame: 'portrait', title: 'Shade', children: null },
  render: () => (
    <div>
      {(['0', 'default', '1'] as const).map((mode) => (
        <LineupCard
          key={mode}
          frame="portrait"
          title="Shade"
          eyebrow=""
          heroImageUrl={HERO_FLAT_WHITE}
          heroDimming={mode === 'default' ? undefined : Number(mode)}
        >
          {null}
        </LineupCard>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const cards = canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-card"]');
    expect(cards).toHaveLength(3);

    // y=1000 sits in the card's empty body slot — below the lockup and the
    // headline, above the 48px bottom pad — so every sample reads photo and
    // shade only, with no glyph in the way. x stops short of 0 and 999 to
    // clear the frame's 1px hairline.
    const y = 1000;
    const xs = [2, 100, 250, 400, 550, 690, 800, 950];
    const points = xs.map((x) => ({ x, y }));
    const [none, byDefault, full] = await Promise.all(
      Array.from(cards).map((card) => samplePixels(card, 'portrait', points, '#151515'))
    );

    // (1) Strength 0 leaves the photograph untouched — pure white, exactly.
    for (const sample of none!) {
      expect(
        [sample.r, sample.g, sample.b],
        `heroDimming={0} must not composite anything over the photo at x=${sample.x}`
      ).toEqual([255, 255, 255]);
    }

    // (2) The default IS the Figma scrim: 0.8 at the content edge, gone by
    // 69.028% of the 1000px frame. 0.01 of opacity is 2.4 of the 255 levels
    // the reading is quantised to, so this is tight to within a rounding step
    // and nowhere near loose enough to accept a different gradient.
    for (const sample of byDefault!) {
      expect(
        shadeAlphaAt(sample),
        `default portrait shade at x=${sample.x} must be the Figma 0.8/69.028% ramp`
      ).toBeCloseTo(expectedAlpha(0.8, sample.x, 1000), 2);
    }
    // Stated once more as the two numbers themselves, so a failure names them.
    expect(shadeAlphaAt(byDefault![0]!), 'peak opacity is 0.8').toBeCloseTo(0.8, 2);
    expect(shadeAlphaAt(byDefault![5]!), 'clear by 69.028% (x=690)').toBeCloseTo(0, 2);

    // (3) A raised value darkens — measured at every sample inside the ramp,
    // and landing on its own predicted curve rather than merely "darker".
    for (const [index, sample] of full!.entries()) {
      const expected = expectedAlpha(1, sample.x, 1000);
      expect(shadeAlphaAt(sample), `heroDimming={1} at x=${sample.x}`).toBeCloseTo(expected, 2);
      if (expected > 0.01) {
        expect(
          sample.g,
          `heroDimming={1} must be visibly darker than the default at x=${sample.x}`
        ).toBeLessThan(byDefault![index]!.g - 5);
      }
    }
  },
};

/**
 * Verification story (not a product story): the square frame's shade is
 * OPT-IN, and when opted into it ramps toward the content column.
 *
 * The square half of the same promise `PortraitShadeMatchesFigma` makes for
 * portrait. Figma 3048:11351 draws the photo panel as a plain image fill with
 * no scrim over it, so the default here is 0 and every square card already in
 * the wild has to come back unchanged — which for a pixel test means the
 * photograph reads as pure white, exactly as it was shot.
 *
 * The opted-in case then has to prove the shape, not just the presence: the
 * square's ramp is MIRRORED against portrait's, strongest at the panel's
 * right edge where it meets the column and clearing 69.028% of the way back
 * across the panel. Sampling right-to-left is what separates that from a flat
 * tint and from portrait's gradient pasted in unrotated — both of which would
 * pass a test that only asked "is it darker".
 */
export const SquareShadeIsOptIn: Story = {
  args: { frame: 'square', title: 'Shade', children: null },
  render: () => (
    <div>
      <LineupCard frame="square" title="Shade" eyebrow="" heroImageUrl={HERO_FLAT_WHITE}>
        {null}
      </LineupCard>
      <LineupCard
        frame="square"
        title="Shade"
        eyebrow=""
        heroImageUrl={HERO_FLAT_WHITE}
        heroDimming={0.6}
      >
        {null}
      </LineupCard>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const cards = canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-card"]');
    expect(cards).toHaveLength(2);

    // y=600 is the panel's vertical midpoint, clear of its 16px rounded
    // corners. The panel is 600px wide and painted OVER the content column,
    // so x up to 598 reads panel.
    const y = 600;
    const xs = [598, 500, 400, 300, 200, 186, 100, 20];
    const points = xs.map((x) => ({ x, y }));
    const [byDefault, opted] = await Promise.all(
      Array.from(cards).map((card) => samplePixels(card, 'square', points, '#151515'))
    );

    // (1) Unchanged by default — the file draws no scrim here, so neither do we.
    for (const sample of byDefault!) {
      expect(
        [sample.r, sample.g, sample.b],
        `square photo panel must be untouched by default at x=${sample.x}`
      ).toEqual([255, 255, 255]);
    }

    // (2) Opted in, the ramp is measured from the panel's RIGHT edge (600px),
    // across 69.028% of the panel's own width.
    for (const sample of opted!) {
      expect(
        shadeAlphaAt(sample),
        `heroDimming={0.6} at x=${sample.x} must ramp from the column edge`
      ).toBeCloseTo(expectedAlpha(0.6, 600 - sample.x, 600), 2);
    }

    // (3) The direction, stated so it cannot be satisfied by a flat tint: the
    // panel is darkest against the column and untouched at its outer edge.
    expect(shadeAlphaAt(opted![0]!), 'darkest at the column edge').toBeCloseTo(0.6, 2);
    expect(
      [opted![7]!.r, opted![7]!.g, opted![7]!.b],
      'the photo keeps full strength at the panel outer edge'
    ).toEqual([255, 255, 255]);
    const alphas = opted!.map(shadeAlphaAt);
    for (let i = 1; i < alphas.length; i++) {
      expect(
        alphas[i]!,
        `shade must fall monotonically away from the column (x=${xs[i]})`
      ).toBeLessThan(alphas[i - 1]! + 0.001);
    }
  },
};

/**
 * Verification story (not a product story): a card with no photograph renders
 * a BRAND FILL, per frame.
 *
 * `heroImageUrl` is an author upload that a large share of cards will simply
 * never get, so this is not an edge case, it is the state most cards start in
 * and many stay in. Left unfilled, the square frame draws its whole 600px
 * left half in the same `#151515` as the column beside it — the split-panel
 * composition collapses into one grey rectangle and the card reads as a
 * failed render.
 *
 * Sampled in pixels rather than asserted on a class or a style string,
 * because the failure this guards against is precisely a fill that is
 * declared and does not paint. The capture runs over a garish `#00ff00`
 * backdrop no part of the design uses, so a hero that composited to nothing
 * comes back unmistakably green rather than plausibly dark.
 */
export const BrandFillWithoutPhoto: Story = {
  args: { frame: 'square', title: 'No photo', children: null },
  render: () => (
    <div>
      <LineupCard frame="square" title="No photo" eyebrow="">
        {null}
      </LineupCard>
      <LineupCard frame="portrait" title="No photo" eyebrow="">
        {null}
      </LineupCard>
      {/* Same square card, with the shade turned up. The plate must ignore it. */}
      <LineupCard frame="square" title="No photo" eyebrow="" heroDimming={0.6}>
        {null}
      </LineupCard>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const cards = canvasElement.querySelectorAll<HTMLElement>('[data-slot="lineup-card"]');
    expect(cards).toHaveLength(3);

    const GROUND: [number, number, number] = [21, 21, 21];
    const BLACK: [number, number, number] = [13, 13, 13];
    const near = (sample: Sample, [r, g, b]: [number, number, number], slack: number) =>
      Math.abs(sample.r - r) <= slack &&
      Math.abs(sample.g - g) <= slack &&
      Math.abs(sample.b - b) <= slack;

    // SQUARE — a deep brand-red plate at the outer edge, resolving to brand
    // black where the panel meets the column.
    //
    // Each sample is checked against the fill COMPUTED from first principles
    // — BTL red at `FILL_RED_PEAK`, falling linearly to nothing at
    // `FILL_RED_REACH`, composited over BTL black — rather than against
    // thresholds. That pins the whole plate: its strength, its falloff and
    // the colour it is mixed from. Thresholds would happily accept a
    // different red, a different ramp, or a flat tint.
    const PEAK = 0.52;
    const REACH = 0.88 * 600;
    const fillAt = (x: number): [number, number, number] => {
      const alpha = Math.max(0, PEAK * (1 - (x + 0.5) / REACH));
      return [226, 6, 19].map((channel) => Math.round(channel * alpha + 13 * (1 - alpha))) as [
        number,
        number,
        number,
      ];
    };

    const squareXs = [2, 150, 300, 450, 598];
    const square = await samplePixels(
      cards[0]!,
      'square',
      squareXs.map((x) => ({ x, y: 600 })),
      '#00ff00'
    );
    for (const sample of square) {
      expect(
        sample.g,
        `square fill must paint something at x=${sample.x} — a green sample is the capture backdrop showing through, i.e. nothing painted at all`
      ).toBeLessThan(200);
      expect(
        near(sample, GROUND, 3),
        `square photo panel must not fall back to the #151515 ground at x=${sample.x} — that is the collapsed composition this fill exists to prevent`
      ).toBe(false);
      const want = fillAt(sample.x);
      expect(
        near(sample, want, 3),
        `square fill at x=${sample.x} must be BTL red at ${PEAK} over BTL black — expected rgb(${want.join(', ')}), got rgb(${sample.r}, ${sample.g}, ${sample.b})`
      ).toBe(true);
    }

    // Unmistakably RED where it is read as identity: a deep crimson, not a
    // neutral dark panel that merely happens to be warm.
    expect(square[0]!.r, 'outer edge reads as red').toBeGreaterThan(90);
    expect(square[0]!.r, 'outer edge is strongly chromatic').toBeGreaterThan(square[0]!.g * 5);
    expect(square[0]!.r, 'outer edge is strongly chromatic').toBeGreaterThan(square[0]!.b * 5);
    // ...but deliberately NOT full-strength BTL red, which shouts down the
    // headline and is what this plate exists to avoid.
    expect(square[0]!.r, 'and is knocked back from the full #E20613').toBeLessThan(170);

    // Arriving at brand black against the column, so the seam disappears.
    expect(
      near(square[4]!, BLACK, 3),
      `square fill must reach BTL black at the column edge, got rgb(${square[4]!.r}, ${square[4]!.g}, ${square[4]!.b})`
    ).toBe(true);
    // And genuinely graded between the two, not a two-tone split.
    for (let i = 1; i < square.length; i++) {
      expect(square[i]!.r, `red falls toward the column (x=${squareXs[i]})`).toBeLessThan(
        square[i - 1]!.r - 10
      );
    }

    // PORTRAIT — flat brand black, and specifically NOT the lighter ground.
    const portrait = await samplePixels(
      cards[1]!,
      'portrait',
      [2, 250, 500, 750, 950].map((x) => ({ x, y: 1000 })),
      '#00ff00'
    );
    for (const sample of portrait) {
      expect(
        near(sample, BLACK, 2),
        `portrait fill must be BTL black at x=${sample.x}, got rgb(${sample.r}, ${sample.g}, ${sample.b})`
      ).toBe(true);
      expect(
        near(sample, GROUND, 3),
        `portrait fill must not be the #151515 ground at x=${sample.x}`
      ).toBe(false);
    }

    // THE SHADE DOES NOT TOUCH THE PLATE.
    //
    // `heroDimming` is documented as shading the PHOTOGRAPH only — darkening
    // a brand colour that was tuned against the headline beside it would drag
    // it somewhere nobody chose, and a setting the author made about their
    // photo should not follow them onto the fallback when they remove it.
    //
    // Worth its own card because nothing else can see it. On the portrait
    // frame the shade is BTL black over a BTL black fill, so it composites to
    // the same pixels whether the rule holds or not; only the square's red
    // plate can tell the difference, and only when the author has opted into
    // a shade the square does not have by default.
    const shaded = await samplePixels(
      cards[2]!,
      'square',
      squareXs.map((x) => ({ x, y: 600 })),
      '#00ff00'
    );
    for (const [index, sample] of shaded.entries()) {
      const plain = square[index]!;
      expect(
        [sample.r, sample.g, sample.b],
        `heroDimming must not darken the brand plate at x=${sample.x} — the fill is not a photograph`
      ).toEqual([plain.r, plain.g, plain.b]);
    }
  },
};

/**
 * Verification story (not a product story): the pitch body FITS the card's
 * body slot, on both axes.
 *
 * The 0.11.0 build drew the square frame's pitch at 515x772.5 in a slot that
 * is 515x734 — a box 38px too tall, hanging 19px past the slot at top and
 * bottom into the 80px gap above it and the column's bottom pad below. It was
 * reported then as an open decision rather than a defect, because closing it
 * costs the pitch its width: the Figma stretches its pitch graphic to aspect
 * 0.702 and a real pitch is 0.667, so a box can match the slot's width or its
 * height, and matching both means distorting the pitch. This is that decision
 * settled — match the HEIGHT, keep the pitch honest, take the narrower box.
 *
 * The width assertion is the one that stops the fix being undone by a later
 * "fill the column" instinct: 489.6 is not a rounding of 515, it is the width
 * a 734px-tall pitch has when its proportions are real.
 */
export const PitchFitsCardBodySlot: Story = {
  args: {
    frame: 'square',
    title: 'Alternative England XI',
    eyebrow: 'Lineup',
    heroImageUrl: HERO_WARM,
    children: null,
  },
  render: (args) => (
    <LineupCard {...args}>
      <CardPitch />
    </LineupCard>
  ),
  play: async ({ canvasElement }) => {
    await settled();
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="lineup-card"]')!;
    const slot = card.querySelector<HTMLElement>('[data-slot="lineup-card-body"]')!;
    const pitch = pitchSvg(card).getBoundingClientRect();
    const box = slot.getBoundingClientRect();

    // The slot is the Figma's own 515x734 (it measures 734.44 — the 0.44px is
    // layout residue from the cap-trimmed text above it, and is what
    // `MatchesFigmaBodySlot` already accepts at 1px).
    expect(box.width, 'body slot is the Figma 515px').toBeCloseTo(515, 0);
    expect(box.height, 'body slot is the Figma 734px').toBeCloseTo(734, 0);

    // (1) The pitch is exactly as tall as the slot — the fix, stated.
    expect(pitch.height, 'pitch box fills the slot height exactly').toBeCloseTo(734, 0);
    expect(pitch.height, 'and is no longer the width-fitted 772.5').not.toBeCloseTo(772.5, 0);

    // (2) It does not overflow the slot, on either axis. Sub-pixel slack only
    // — this is a containment claim, so it is stated as one.
    expect(pitch.top, 'pitch must not hang above the slot').toBeGreaterThanOrEqual(box.top - 0.05);
    expect(pitch.bottom, 'pitch must not hang below the slot').toBeLessThanOrEqual(
      box.bottom + 0.05
    );
    expect(pitch.left, 'pitch must not spill left of the slot').toBeGreaterThanOrEqual(
      box.left - 0.05
    );
    expect(pitch.right, 'pitch must not spill right of the slot').toBeLessThanOrEqual(
      box.right + 0.05
    );

    // (3) The pitch keeps its real 2:3 proportions — the whole reason the box
    // is narrower than the column. A distorted pitch would sit at 515 wide.
    expect(pitch.width / pitch.height, 'pitch stays a true 2:3, undistorted').toBeCloseTo(2 / 3, 3);
    expect(pitch.width, 'which makes it 489.6 wide, not the column’s 515').toBeCloseTo(489.6, 0);
  },
};

/**
 * Verification story (not a product story): a STANDALONE `LineupPitch` is
 * untouched by the card's slot fit.
 *
 * This is the guard on the blast radius. `LineupPitch` is the editor's lineup
 * builder, the published reader's lineup block and Match Centre's team sheet;
 * changing how it fits its container globally would re-render every article
 * already published with one. The card's `fit` / `pitchPadding` defaults are
 * therefore reached only through `useLineupFrame`, and this pins the other
 * side of that boundary in the three shapes real hosts actually render.
 *
 * The numbers are frozen from `origin/main` at 0.11.0, measured before the
 * change landed — including the SVG's class list and viewBox, because a
 * regression here would most likely arrive as the height fit leaking out of
 * the card rather than as a subtle drift.
 */
export const StandaloneFitIsUnchanged: Story = {
  args: { frame: 'square', title: 'unused', children: null },
  render: () => (
    <div>
      {/* the editor's inline lineup card / the published reader's plate */}
      <div data-host="reader" style={{ width: 590 }}>
        <LineupPitch slots={englandSlots()} formation="4-3-3" teamName="England" />
      </div>
      {/* Match Centre, portrait */}
      <div data-host="portrait" style={{ width: 420 }}>
        <LineupPitch
          slots={englandSlots()}
          orientation="portrait"
          markerContent="headshot"
          showNames
        />
      </div>
      {/* the editor's fullscreen builder, which asks for a height fit ITSELF */}
      <div data-host="fullscreen" style={{ width: 900, height: 500 }}>
        <LineupPitch slots={englandSlots()} fullscreen editable fit="height" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await settled();

    const expected = {
      reader: {
        class: 'w-full h-auto aspect-[3/2]',
        viewBox: '-10.500000000000002 -7 121 80.66666666666666',
        svg: { w: 590, h: 393.328 },
        grass: { w: 487.597, h: 325.065 },
      },
      portrait: {
        class: 'w-full h-auto aspect-[2/3]',
        viewBox: '-7 -10.500000000000002 80.66666666666666 121',
        svg: { w: 420, h: 630 },
        grass: { w: 347.107, h: 520.661 },
      },
      fullscreen: {
        class: 'h-full w-auto max-w-full aspect-[3/2]',
        viewBox: '-10.500000000000002 -7 121 80.66666666666666',
        svg: { w: 900, h: 600 },
        grass: { w: 743.802, h: 495.868 },
      },
    };

    for (const [host, want] of Object.entries(expected)) {
      const root = canvasElement.querySelector<HTMLElement>(`[data-host="${host}"]`)!;
      const svg = pitchSvg(root);
      const svgBox = svg.getBoundingClientRect();
      const grass = svg.querySelector('rect')!.getBoundingClientRect();

      // The class list carries the fit — `w-full h-auto` is a width fit,
      // `h-full w-auto` a height one — so pinning it catches the leak
      // directly, before any measurement has to notice it.
      expect(svg.getAttribute('class'), `${host}: fit classes unchanged`).toBe(want.class);
      // The viewBox carries `pitchPadding`, the card's other default.
      expect(svg.getAttribute('viewBox'), `${host}: padded viewBox unchanged`).toBe(want.viewBox);

      expect(svgBox.width, `${host}: pitch box width unchanged`).toBeCloseTo(want.svg.w, 1);
      expect(svgBox.height, `${host}: pitch box height unchanged`).toBeCloseTo(want.svg.h, 1);
      expect(grass.width, `${host}: drawn pitch width unchanged`).toBeCloseTo(want.grass.w, 1);
      expect(grass.height, `${host}: drawn pitch height unchanged`).toBeCloseTo(want.grass.h, 1);
    }
  },
};
