import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContactService } from './contact.service';

@Controller('social')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get('contacts')
  getContacts(@CurrentUser('id') userId: number) {
    return this.contactService.getContacts(userId);
  }

  @Get('contacts/requests')
  getRequests(@CurrentUser('id') userId: number) {
    return this.contactService.getRequests(userId);
  }

  @Get('contacts/requests/sent')
  getSentRequests(@CurrentUser('id') userId: number) {
    return this.contactService.getSentRequests(userId);
  }

  @Get('contacts/search')
  searchContacts(@Query('keyword') keyword: string) {
    return this.contactService.searchContacts(keyword);
  }

  @Post('contacts/request')
  sendRequest(@CurrentUser('id') userId: number, @Body('account') account: string) {
    return this.contactService.sendRequest(userId, account);
  }

  @Put('contacts/request/:id')
  handleRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('accept') accept: boolean,
  ) {
    return this.contactService.handleRequest(userId, id, accept);
  }

  @Put('contacts/:id/remark')
  updateRemark(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) friendId: number,
    @Body('remark') remark: string,
  ) {
    return this.contactService.updateRemark(userId, friendId, remark);
  }

  @Delete('contacts/:id')
  deleteContact(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) friendId: number) {
    return this.contactService.deleteContact(userId, friendId);
  }

  @Post('groups')
  createGroup(
    @CurrentUser('id') userId: number,
    @Body('name') name: string,
    @Body('memberIds') memberIds: number[],
  ) {
    return this.contactService.createGroup(userId, name, memberIds);
  }

  @Put('groups/:id')
  updateGroup(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.contactService.updateGroup(userId, id, name);
  }

  @Get('groups/:id/info')
  getGroupInfo(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contactService.getGroupInfo(userId, id);
  }

  @Put('groups/:id/announcement')
  updateAnnouncement(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('announcement') announcement: string,
  ) {
    return this.contactService.updateAnnouncement(userId, id, announcement);
  }

  @Put('groups/:id/my-nickname')
  updateMyGroupNickname(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('nickname') nickname: string,
  ) {
    return this.contactService.updateMyGroupNickname(userId, id, nickname);
  }

  @Delete('groups/:id')
  deleteGroup(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.contactService.deleteGroup(userId, id);
  }

  @Get('groups/:id/members')
  getGroupMembers(@Param('id', ParseIntPipe) id: number) {
    return this.contactService.getGroupMembers(id);
  }

  @Post('groups/:id/members')
  addGroupMember(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('memberId') memberId: number,
  ) {
    return this.contactService.addGroupMember(userId, id, memberId);
  }

  @Delete('groups/:id/members/:uid')
  removeGroupMember(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) uid: number,
  ) {
    return this.contactService.removeGroupMember(userId, id, uid);
  }

  @Put('groups/:id/members/:uid/role')
  setGroupAdmin(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) uid: number,
    @Body('role') role: number,
  ) {
    return this.contactService.setGroupAdmin(userId, id, uid, role);
  }
}
