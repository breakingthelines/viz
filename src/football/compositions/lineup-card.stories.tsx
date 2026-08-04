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
 * `pitchPadding` is the ONE prop this frame needed adding to `LineupPitch`
 * (see its doc). At the hardcoded default of 7 the padded viewBox shrinks the
 * drawn pitch to ~425px inside the card's 515px column — a dead gutter the
 * Figma does not have, where it runs the pitch to both edges of the panel.
 * 1.7 sizes the drawing to the slot's full 734px height, the dimension the
 * eye actually reads in this composition, leaving it ~5% narrower than the
 * Figma's. That last 5% is unreachable honestly: the Figma pitch graphic is
 * stretched to 515x734 (aspect 0.702) while a real pitch — and so viz's — is
 * 2:3 (0.667), and matching the width as well would mean distorting the
 * pitch. Nothing else about the frame needed a new prop.
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
      // rather than eyeballed. At `pitchPadding={1.7}` the pitch declares a
      // 70.0667-unit-wide viewBox across the card's 515px column, i.e. 7.3502
      // px per unit, so the file's 64px disc is a 32px radius is 4.354 units.
      //
      // Was 5.0, whose comment claimed the same 64px but measured 73.5px — 15%
      // over. That mattered for more than the discs: `nameFontSize` is derived
      // from `markerSize`, so the oversized marker also set the name chips at
      // 26.4px against the file's 22px, and the two errors together were what
      // collided the back four's chips. At 4.354 the labels land at 22.98px.
      //
      markerSize={4.354}
      // 2.993 units = the file's own 22px label, at the same 7.3502 px/unit.
      // Pinned rather than derived: `nameFontSize`'s default ratio (0.718)
      // would put it at 22.98px, and that ratio is the reader plate's
      // deliberate legibility bump from 0.9.1/0.9.2 — right for a lineup read
      // in a feed, but this card is a design match to a fixed artboard. See
      // the prop's own doc for why the card states the size instead of the two
      // surfaces fighting over one ratio.
      nameFontSize={2.993}
      pitchPadding={1.7}
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
    expect(svg.getBoundingClientRect().width, 'pitch fills the 515px column').toBeCloseTo(515, 0);

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
