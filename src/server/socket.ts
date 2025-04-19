import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

interface Message {
    id: string;
    userId: string;
    content: string;
    timestamp: Date;
}

export function setupSocket(server: HttpServer) {
    const io = new Server(server);
    const messages: Message[] = [];

    io.on('connection', (socket) => {
        console.log('A user connected');

        // Send chat history to new user
        socket.emit('chat history', messages);

        socket.on('chat message', (message: Omit<Message, 'id'>) => {
            const newMessage: Message = {
                ...message,
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date()
            };
            messages.push(newMessage);
            io.emit('chat message', newMessage);
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });
    });

    return io;
} 