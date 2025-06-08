import prisma from "../utils/prisma";
import { Log } from "../interfaces";

export async function createLog(log: Log) {
  console.log('Starting to create log:', JSON.stringify(log, null, 2));
  
  try {
    console.log('Connecting to Prisma...');
    await prisma.$connect();
    console.log('Successfully connected to Prisma');
    
    console.log('Creating log in database...');
    const createdLog = await prisma.log.create({
      data: {
        executionId: log.executionId,
        type: log.type,
        event: log.event,
        webpage: log.webpage,
        message: log.message,
        duration: log.duration || "",
        url: log.url || "",
        data: log.data || "",
      },
    });
    
    console.log('Successfully created log:', createdLog.id);
    return createdLog;
  } catch (error: unknown) {
    console.error('Error in createLog:');
    
    if (error instanceof Error) {
      const prismaError = error as any;
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: prismaError.code,
        meta: prismaError.meta
      });
      
      // Check if it's a Prisma error
      if (prismaError.code) {
        console.error('Prisma error code:', prismaError.code);
        console.error('Prisma error meta:', prismaError.meta);
      }
    } else {
      console.error('Unknown error type:', error);
    }
    
    throw error;
  } finally {
    try {
      console.log('Disconnecting from Prisma...');
      await prisma.$disconnect();
      console.log('Successfully disconnected from Prisma');
    } catch (disconnectError: unknown) {
      if (disconnectError instanceof Error) {
        console.error('Error disconnecting from Prisma:', {
          name: disconnectError.name,
          message: disconnectError.message,
          stack: disconnectError.stack
        });
      } else {
        console.error('Unknown error while disconnecting from Prisma:', disconnectError);
      }
    }
  }
}
